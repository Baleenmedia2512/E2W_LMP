import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import prisma from '@/shared/lib/db/prisma';

/**
 * GET /api/dsr/stats
 * Fetch Daily Sales Report (DSR) statistics with comprehensive filtering
 * 
 * Query Parameters:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - agentId: Filter by assigned user/agent (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const agentId = searchParams.get('agentId');

    // Build date filter
    const dateFilter: any = {};
    if (startDateParam) {
      const startDate = new Date(startDateParam);
      startDate.setHours(0, 0, 0, 0);
      dateFilter.gte = startDate;
    }
    if (endDateParam) {
      const endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.lte = endDate;
    }

    // Build base where clause for leads
    const leadsWhere: any = {};
    if (Object.keys(dateFilter).length > 0) {
      leadsWhere.createdAt = dateFilter;
    }
    if (agentId) {
      leadsWhere.assignedToId = agentId;
    }

    // Build where clause for calls
    const callsWhere: any = {};
    if (Object.keys(dateFilter).length > 0) {
      callsWhere.createdAt = dateFilter;
    }
    if (agentId) {
      callsWhere.callerId = agentId;
    }

    const now = new Date();

    // Fetch all DSR stats in parallel
    const [
      // New Leads Handled Today (in date range)
      newLeadsHandledToday,
      
      // Total New Leads (all time for selected agent)
      totalNewLeads,
      
      // Follow-ups Handled Today (in date range)
      followUpsHandledToday,
      
      // Total Follow-ups
      totalFollowUps,
      
      // Unqualified Today
      unqualifiedToday,
      
      // Unreachable Today
      unreachableToday,
      
      // Won Deals Today
      wonToday,
      
      // Lost Deals Today
      lostToday,
      
      // Overdue Follow-ups
      overdueFollowUps,
      
      // High Priority Overdue
      highPriorityOverdue,
      
      // Total Calls in date range
      totalCalls,
      
      // Completed Calls
      completedCalls,
      
      // Get all leads in date range for table
      filteredLeads,
      
      // Get agent performance data
      agents,
    ] = await Promise.all([
      // 1. New leads in date range
      prisma.lead.count({ where: leadsWhere }),
      
      // 2. Total new leads (all time for agent)
      prisma.lead.count({
        where: agentId ? { assignedToId: agentId } : {},
      }),
      
      // 3. Follow-ups in date range
      prisma.followUp.count({
        where: {
          status: 'pending',
          ...(Object.keys(dateFilter).length > 0 && { scheduledAt: dateFilter }),
          ...(agentId && {
            lead: {
              assignedToId: agentId,
            },
          }),
        },
      }),
      
      // 4. Total follow-ups
      prisma.followUp.count({
        where: agentId ? {
          lead: {
            assignedToId: agentId,
          },
        } : {},
      }),
      
      // 5. Unqualified in date range
      prisma.lead.count({
        where: {
          ...leadsWhere,
          status: 'unqualified',
          ...(Object.keys(dateFilter).length > 0 && { updatedAt: dateFilter }),
        },
      }),
      
      // 6. Unreachable in date range
      prisma.lead.count({
        where: {
          ...leadsWhere,
          status: 'unreach',
          ...(Object.keys(dateFilter).length > 0 && { updatedAt: dateFilter }),
        },
      }),
      
      // 7. Won deals in date range
      prisma.lead.count({
        where: {
          ...leadsWhere,
          status: 'won',
          ...(Object.keys(dateFilter).length > 0 && { updatedAt: dateFilter }),
        },
      }),
      
      // 8. Lost deals in date range
      prisma.lead.count({
        where: {
          ...leadsWhere,
          status: 'lost',
          ...(Object.keys(dateFilter).length > 0 && { updatedAt: dateFilter }),
        },
      }),
      
      // 9. Overdue follow-ups
      prisma.followUp.count({
        where: {
          status: 'pending',
          scheduledAt: { lt: now },
          ...(agentId && {
            lead: {
              assignedToId: agentId,
            },
          }),
        },
      }),
      
      // 10. High priority overdue
      prisma.followUp.count({
        where: {
          status: 'pending',
          scheduledAt: { lt: now },
          priority: 'high',
          ...(agentId && {
            lead: {
              assignedToId: agentId,
            },
          }),
        },
      }),
      
      // 11. Total calls in date range
      prisma.callLog.count({ where: callsWhere }),
      
      // 12. Completed calls
      prisma.callLog.count({
        where: {
          ...callsWhere,
          callStatus: 'completed',
        },
      }),
      
      // 13. Get filtered leads for table
      prisma.lead.findMany({
        where: leadsWhere,
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100, // Limit to 100 leads for performance
      }),
      
      // 14. Get all active agents
      prisma.user.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Calculate agent performance data
    const agentPerformanceData = await Promise.all(
      (agentId ? agents.filter(a => a.id === agentId) : agents).map(async (agent) => {
        const [callsMade, leadsGenerated, conversions] = await Promise.all([
          // Calls made by agent in date range
          prisma.callLog.count({
            where: {
              callerId: agent.id,
              ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
            },
          }),
          
          // Leads generated by agent in date range
          prisma.lead.count({
            where: {
              assignedToId: agent.id,
              ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
            },
          }),
          
          // Conversions (won leads) by agent in date range
          prisma.lead.count({
            where: {
              assignedToId: agent.id,
              status: 'won',
              ...(Object.keys(dateFilter).length > 0 && { updatedAt: dateFilter }),
            },
          }),
        ]);

        // Determine status based on performance
        let status = 'Active';
        if (callsMade === 0 && leadsGenerated === 0) {
          status = 'Inactive';
        } else if (conversions > 2) {
          status = 'Excellent';
        } else if (conversions > 0) {
          status = 'Good';
        }

        return {
          agentId: agent.id,
          agentName: agent.name || 'Unknown',
          agentEmail: agent.email,
          date: startDateParam ? new Date(startDateParam) : new Date(),
          callsMade,
          leadsGenerated,
          conversions,
          status,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          newLeadsHandledToday,
          totalNewLeads,
          followUpsHandledToday,
          totalFollowUps,
          unqualifiedToday,
          unreachableToday,
          wonToday,
          lostToday,
          overdueFollowUps,
          highPriorityOverdue,
          totalCalls,
          completedCalls,
        },
        filteredLeads,
        agentPerformanceData,
        agents,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching DSR stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch DSR statistics' },
      { status: 500 }
    );
  }
}
