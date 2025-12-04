import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { calculateDSRMetrics } from '@/shared/lib/utils/dsr-metrics';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

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

    console.log('[DSR Stats API] Request params:', { startDateParam, endDateParam, agentId });

    // Build date filter
    const dateFilter: any = {};
    if (startDateParam) {
      try {
        const startDate = new Date(startDateParam);
        startDate.setHours(0, 0, 0, 0);
        dateFilter.gte = startDate;
      } catch (e) {
        console.error('[DSR Stats API] Invalid start date:', e);
      }
    }
    if (endDateParam) {
      try {
        const endDate = new Date(endDateParam);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.lte = endDate;
      } catch (e) {
        console.error('[DSR Stats API] Invalid end date:', e);
      }
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

    console.log('[DSR Stats API] Fetching data from database...');

    // Fetch all data needed for DSR calculations with try-catch for each query
    let allLeads, allFollowups, allCalls, filteredLeads, agents;
    
    try {
      // 1. Fetch all leads with relevant fields
      allLeads = await prisma.lead.findMany({
        where: agentId ? { assignedToId: agentId } : {},
        select: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          assignedToId: true,
        },
      });
      console.log('[DSR Stats API] Fetched leads:', allLeads.length);
    } catch (error) {
      console.error('[DSR Stats API] Error fetching leads:', error);
      throw new Error('Failed to fetch leads');
    }

    try {
      // 2. Fetch all followups
      allFollowups = await prisma.followUp.findMany({
        where: agentId ? {
          Lead: {
            assignedToId: agentId,
          },
        } : {},
        select: {
          id: true,
          leadId: true,
          scheduledAt: true,
          createdAt: true,
        },
      });
      console.log('[DSR Stats API] Fetched followups:', allFollowups.length);
    } catch (error) {
      console.error('[DSR Stats API] Error fetching followups:', error);
      throw new Error('Failed to fetch followups');
    }

    try {
      // 3. Fetch all calls
      allCalls = await prisma.callLog.findMany({
        where: agentId ? {
          callerId: agentId,
        } : {},
        select: {
          id: true,
          leadId: true,
          createdAt: true,
        },
      });
      console.log('[DSR Stats API] Fetched calls:', allCalls.length);
    } catch (error) {
      console.error('[DSR Stats API] Error fetching calls:', error);
      throw new Error('Failed to fetch calls');
    }

    try {
      // 4. Get filtered leads for table display (limited to date range if specified)
      filteredLeads = await prisma.lead.findMany({
        where: leadsWhere,
        include: {
          User_Lead_assignedToIdToUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          User_Lead_createdByIdToUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100, // Limit to 100 leads for performance
      });
      console.log('[DSR Stats API] Fetched filtered leads:', filteredLeads.length);
    } catch (error) {
      console.error('[DSR Stats API] Error fetching filtered leads:', error);
      throw new Error('Failed to fetch filtered leads');
    }

    try {
      // 5. Get all active agents
      agents = await prisma.user.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: { name: 'asc' },
      });
      console.log('[DSR Stats API] Fetched agents:', agents.length);
    } catch (error) {
      console.error('[DSR Stats API] Error fetching agents:', error);
      throw new Error('Failed to fetch agents');
    }

    console.log('[DSR Stats API] Database queries complete. Data counts:', {
      allLeads: allLeads.length,
      allFollowups: allFollowups.length,
      allCalls: allCalls.length,
      filteredLeads: filteredLeads.length,
      agents: agents.length
    });

    // Transform filteredLeads to match frontend expectations
    const transformedFilteredLeads = filteredLeads.map(lead => ({
      ...lead,
      assignedTo: lead.User_Lead_assignedToIdToUser,
      createdBy: lead.User_Lead_createdByIdToUser,
      User_Lead_assignedToIdToUser: undefined,
      User_Lead_createdByIdToUser: undefined,
    }));

    // Calculate DSR metrics using the new service
    console.log('[DSR Stats API] Calculating metrics...');
    const metrics = calculateDSRMetrics({
      leads: allLeads,
      followups: allFollowups,
      calls: allCalls,
      agentId: agentId || null,
      dateRange: (startDateParam || endDateParam) ? {
        startDate: startDateParam || undefined,
        endDate: endDateParam || undefined,
      } : undefined,
    });

    console.log('[DSR Stats API] Metrics calculated successfully');

    // Calculate agent performance data
    console.log('[DSR Stats API] Calculating agent performance...');
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
          
          // Leads created/assigned to agent in date range
          prisma.lead.count({
            where: {
              assignedToId: agent.id,
              ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
            },
          }),
          
          // Conversions (won leads) by agent in date range (when status changed to won)
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
        } else if (conversions >= 2) {
          status = 'Excellent';
        } else if (conversions > 0 || (callsMade > 5 && leadsGenerated > 0)) {
          status = 'Good';
        }

        return {
          agentId: agent.id,
          agentName: agent.name || 'Unknown',
          agentEmail: agent.email,
          date: endDateParam ? new Date(endDateParam) : new Date(),
          callsMade,
          leadsGenerated,
          conversions,
          status,
        };
      })
    );

    console.log('[DSR Stats API] Agent performance calculated. Preparing response...');

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          // New Leads Handled (today/total)
          newLeadsHandledToday: metrics.newLeads.today,
          totalNewLeads: metrics.newLeads.total,
          
          // Follow-ups Handled (today/total)
          followUpsHandledToday: metrics.followups.today,
          totalFollowUps: metrics.followups.total,
          
          // Total Calls (today only)
          totalCalls: metrics.calls.today,
          
          // Overdue Follow-ups (total only)
          overdueFollowUps: metrics.overdueFollowups.total,
          
          // Unqualified (today/total)
          unqualifiedToday: metrics.unqualified.today,
          totalUnqualified: metrics.unqualified.total,
          
          // Unreachable (today/total)
          unreachableToday: metrics.unreachable.today,
          totalUnreachable: metrics.unreachable.total,
          
          // Won Deals (today/total)
          wonToday: metrics.won.today,
          totalWon: metrics.won.total,
          
          // Lost Deals (today/total)
          lostToday: metrics.lost.today,
          totalLost: metrics.lost.total,
          
          // Legacy fields for backward compatibility
          completedCalls: 0, // Deprecated - keeping for backward compatibility
        },
        filteredLeads: transformedFilteredLeads,
        agentPerformanceData,
        agents,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[DSR Stats API] Error:', error);
    console.error('[DSR Stats API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch DSR statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
