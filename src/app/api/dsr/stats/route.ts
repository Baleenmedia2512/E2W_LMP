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

    // Calculate reference date for overdue (end of selected date or current time)
    const referenceDate = endDateParam ? new Date(endDateParam) : new Date();
    if (endDateParam) {
      referenceDate.setHours(23, 59, 59, 999);
    }

    console.log('[DSR Stats API] Fetching data from database...');

    // Fetch all data needed for DSR calculations with try-catch for each query
    let allLeads, allFollowups, allCalls, filteredLeads, agents;
    let leadsCreatedOnDate: any[] = [];
    let callsOnDate: any[] = [];
    let leadsUpdatedOnDate: any[] = [];
    
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
      // 3. Fetch all calls with attemptNumber and callStatus
      allCalls = await prisma.callLog.findMany({
        where: agentId ? {
          callerId: agentId,
        } : {},
        select: {
          id: true,
          leadId: true,
          createdAt: true,
          attemptNumber: true,
          callStatus: true,
        },
      });
      console.log('[DSR Stats API] Fetched calls:', allCalls.length);
    } catch (error) {
      console.error('[DSR Stats API] Error fetching calls:', error);
      throw new Error('Failed to fetch calls');
    }

    try {
      // 4. Get leads for table display based on what happened on the selected date
      // This will be all leads that had ANY activity on the selected date:
      // - Leads created on the date
      // - Leads that had calls on the date
      // - Leads whose status changed on the date
      
      leadsCreatedOnDate = await prisma.lead.findMany({
        where: {
          createdAt: dateFilter,
          ...(agentId && { assignedToId: agentId }),
        },
        select: { id: true },
      });

      callsOnDate = await prisma.callLog.findMany({
        where: {
          createdAt: dateFilter,
          ...(agentId && { Lead: { assignedToId: agentId } }),
        },
        select: { 
          leadId: true,
          attemptNumber: true,
        },
      });

      leadsUpdatedOnDate = await prisma.lead.findMany({
        where: {
          updatedAt: dateFilter,
          ...(agentId && { assignedToId: agentId }),
        },
        select: { id: true },
      });

      // Combine all lead IDs that had activity on the selected date
      const activeLeadIds = new Set([
        ...leadsCreatedOnDate.map(l => l.id),
        ...callsOnDate.map(c => c.leadId),
        ...leadsUpdatedOnDate.map(l => l.id),
      ]);

      // Fetch full lead details for all active leads
      filteredLeads = await prisma.lead.findMany({
        where: {
          id: { in: Array.from(activeLeadIds) },
        },
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
          CallLog: {
            where: {
              createdAt: dateFilter,
            },
            orderBy: {
              createdAt: 'asc',
            },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
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

    // Transform filteredLeads to match frontend expectations and add activity metadata
    const transformedFilteredLeads = filteredLeads.map(lead => {
      const wasCreatedToday = Object.keys(dateFilter).length > 0 && 
        leadsCreatedOnDate.some(l => l.id === lead.id);
      const hadCallToday = callsOnDate.some(c => c.leadId === lead.id);
      const wasUpdatedToday = leadsUpdatedOnDate.some(l => l.id === lead.id);
      
      // Check if this lead had its FIRST call on the selected date
      const firstCallToday = lead.CallLog && lead.CallLog.length > 0 && 
        lead.CallLog[0].attemptNumber === 1;
      
      // Check if this lead had FOLLOW-UP calls (attemptNumber > 1) on selected date
      const hadFollowupCallToday = callsOnDate.some(c => 
        c.leadId === lead.id && c.attemptNumber > 1
      );
      
      return {
        ...lead,
        assignedTo: lead.User_Lead_assignedToIdToUser,
        createdBy: lead.User_Lead_createdByIdToUser,
        User_Lead_assignedToIdToUser: undefined,
        User_Lead_createdByIdToUser: undefined,
        CallLog: undefined, // Remove CallLog from response
        // Activity flags for frontend filtering
        activityFlags: {
          createdToday: wasCreatedToday,
          hadCallToday: hadCallToday,
          statusChangedToday: wasUpdatedToday,
          isNewLead: firstCallToday, // First call made on selected date
          isFollowup: hadFollowupCallToday, // Follow-up call (attemptNumber > 1) made on selected date
        },
      };
    });

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

    // Calculate agent performance data with all required metrics
    console.log('[DSR Stats API] Calculating agent performance...');
    const agentPerformanceData = await Promise.all(
      (agentId ? agents.filter(a => a.id === agentId) : agents).map(async (agent) => {
        // Fetch calls made on leads assigned to this agent in the date range
        const agentCalls = await prisma.callLog.findMany({
          where: {
            Lead: {
              assignedToId: agent.id,
            },
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
          },
          select: {
            leadId: true,
            attemptNumber: true,
          },
        });

        // Count unique leads with first calls (attemptNumber = 1)
        const newLeadsSet = new Set<string>();
        agentCalls.forEach(call => {
          if (call.attemptNumber === 1) {
            newLeadsSet.add(call.leadId);
          }
        });
        const newLeads = newLeadsSet.size;

        // Count follow-up calls (attemptNumber > 1)
        const followUps = agentCalls.filter(call => call.attemptNumber > 1).length;

        // Total calls for this agent
        const totalCalls = agentCalls.length;

        const [won, lost, unreachable, overdue] = await Promise.all([
          // Won - leads marked won by agent in date range
          prisma.lead.count({
            where: {
              assignedToId: agent.id,
              status: 'won',
              ...(Object.keys(dateFilter).length > 0 && { updatedAt: dateFilter }),
            },
          }),
          
          // Lost - leads marked lost by agent in date range
          prisma.lead.count({
            where: {
              assignedToId: agent.id,
              status: 'lost',
              ...(Object.keys(dateFilter).length > 0 && { updatedAt: dateFilter }),
            },
          }),
          
          // Unreachable - leads marked unreachable by agent in date range
          prisma.lead.count({
            where: {
              assignedToId: agent.id,
              status: 'unreach',
              ...(Object.keys(dateFilter).length > 0 && { updatedAt: dateFilter }),
            },
          }),
          
          // Overdue - follow-ups that are overdue relative to selected date
          prisma.followUp.count({
            where: {
              Lead: {
                assignedToId: agent.id,
              },
              scheduledAt: {
                lt: referenceDate,
              },
              status: {
                not: 'completed',
              },
            },
          }),
        ]);

        return {
          agentId: agent.id,
          agentName: agent.name || 'Unknown',
          agentEmail: agent.email,
          date: endDateParam ? new Date(endDateParam) : new Date(),
          newLeads,
          followUps,
          totalCalls,
          won,
          lost,
          unreachable,
          overdue,
        };
      })
    );

    console.log('[DSR Stats API] Agent performance calculated. Preparing response...');

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          // New Leads - first calls on selected date / new leads created on selected date
          newLeadsHandled: metrics.newLeads.handled,
          totalNewLeads: metrics.newLeads.total,
          
          // Follow-ups - follow-up calls on selected date / total follow-ups due on selected date
          followUpsHandled: metrics.followups.handled,
          totalFollowUps: metrics.followups.total,
          
          // Total Calls - calls made on selected date
          totalCalls: metrics.calls.total,
          
          // Overdue - overdue follow-ups by selected date
          overdueFollowUps: metrics.overdueFollowups.total,
          
          // Unqualified - marked on selected date
          unqualified: metrics.unqualified.total,
          
          // Unreachable - marked on selected date
          unreachable: metrics.unreachable.total,
          
          // Won - closed on selected date
          won: metrics.won.total,
          
          // Lost - lost on selected date
          lost: metrics.lost.total,
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
