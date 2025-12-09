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
 * FINAL IMPLEMENTATION - Matches exact user requirements:
 * 
 * DATA SOURCES:
 * - CALLS PAGE: CallLog filtered by createdAt = selected_date
 *   • New Calls: attemptNumber = 1
 *   • Follow-up Calls: attemptNumber > 1
 *   • Overdue Calls Handled: previous_followup_date < selected_date
 *   • Total Calls: All calls
 * 
 * - LEADS OUTCOME PAGE: Lead filtered by updatedAt = selected_date
 *   • Unqualified, Unreachable, Won, Lost: status changes on selected date
 * 
 * Query Parameters:
 * - startDate: ISO date string (optional, defaults to TODAY)
 * - endDate: ISO date string (optional, defaults to TODAY)
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
          callAttempts: true,
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
      // IMPORTANT: Apply date filter here to avoid counting calls outside selected date
      const callsWhere: any = {};
      if (Object.keys(dateFilter).length > 0) {
        callsWhere.createdAt = dateFilter;
      }
      if (agentId) {
        callsWhere.callerId = agentId;
      }
      
      allCalls = await prisma.callLog.findMany({
        where: callsWhere,
        select: {
          id: true,
          leadId: true,
          createdAt: true,
          attemptNumber: true,
          callStatus: true,
        },
      });
      console.log('[DSR Stats API] ===== TOTAL CALLS COUNT =====');
      console.log('[DSR Stats API] Fetched calls for date range:', allCalls.length);
      console.log('[DSR Stats API] Date filter:', dateFilter);
      console.log('[DSR Stats API] Agent filter:', agentId || 'None');
      console.log('[DSR Stats API] ================================');
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
          ...(agentId && { callerId: agentId }), // Use callerId for consistency
        },
        select: { 
          leadId: true,
          attemptNumber: true,
          createdAt: true,
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

    // Build a map of leadId -> most recent scheduled follow-up date for overdue detection
    const leadFollowupMap = new Map<string, Date>();
    allFollowups.forEach(followup => {
      const scheduledDate = typeof followup.scheduledAt === 'string' 
        ? new Date(followup.scheduledAt) 
        : followup.scheduledAt;
      
      const existing = leadFollowupMap.get(followup.leadId);
      if (!existing || scheduledDate > existing) {
        leadFollowupMap.set(followup.leadId, scheduledDate);
      }
    });

    // Transform filteredLeads to match frontend expectations and add activity metadata
    // CRITICAL: These flags MUST match the exact KPI logic for perfect count matching
    const transformedFilteredLeads = filteredLeads.map(lead => {
      const wasCreatedToday = Object.keys(dateFilter).length > 0 && 
        leadsCreatedOnDate.some(l => l.id === lead.id);
      const hadCallToday = callsOnDate.some(c => c.leadId === lead.id);
      const wasUpdatedToday = leadsUpdatedOnDate.some(l => l.id === lead.id);
      
      // Get all calls for this lead on the selected date
      const leadsCallsToday = callsOnDate.filter(c => c.leadId === lead.id);
      
      // ===== EXACT KPI LOGIC IMPLEMENTATION =====
      
      // 1️⃣ New Calls: CallLog.createdAt = selected_date AND Lead.callAttempts = 1
      // A lead is "New Call" if it had a call today AND its callAttempts field = 1
      const isNewCall = hadCallToday && (lead.callAttempts || 0) === 1;
      
      // 2️⃣ Follow-Up Calls: CallLog.createdAt = selected_date AND Lead.callAttempts > 1
      // A lead is "Follow-Up" if it had a call today AND its callAttempts field > 1
      const isFollowupCall = hadCallToday && (lead.callAttempts || 0) > 1;
      
      // 3️⃣ Total Calls: CallLog.createdAt = selected_date
      // Any lead that had a call today (already captured in hadCallToday)
      
      // 4️⃣ Overdue Calls Handled: CallLog.createdAt = selected_date AND FollowUp.scheduledAt < selected_date
      // A lead had an overdue call if it had a call today AND there was a follow-up scheduled before today
      const hadOverdueCallToday = hadCallToday && (() => {
        // Determine reference date (end of selected date or current time)
        let referenceDate: Date;
        if (endDateParam) {
          referenceDate = new Date(endDateParam);
          referenceDate.setHours(23, 59, 59, 999);
        } else {
          referenceDate = new Date();
        }
        
        // Check if this lead had a follow-up scheduled before the reference date
        const scheduledFollowup = leadFollowupMap.get(lead.id);
        if (!scheduledFollowup) return false;
        
        return scheduledFollowup < referenceDate;
      })();
      
      // 5️⃣-8️⃣ Status-based outcomes: Lead.status = X AND Lead.updatedAt = selected_date
      // These are already captured in wasUpdatedToday flag + lead.status
      
      // Debug logging
      if (hadCallToday) {
        console.log(`[DSR Transform] Lead ${lead.name}: callAttempts=${lead.callAttempts}, isNew=${isNewCall}, isFollowup=${isFollowupCall}, isOverdue=${hadOverdueCallToday}`);
      }
      
      return {
        ...lead,
        assignedTo: lead.User_Lead_assignedToIdToUser,
        createdBy: lead.User_Lead_createdByIdToUser,
        User_Lead_assignedToIdToUser: undefined,
        User_Lead_createdByIdToUser: undefined,
        CallLog: undefined,
        // Activity flags matching EXACT KPI logic
        activityFlags: {
          createdToday: wasCreatedToday,
          hadCallToday: hadCallToday,                // For Total Calls filter
          statusChangedToday: wasUpdatedToday,       // For outcome filters (won, lost, etc.)
          isNewLead: isNewCall,                      // CallLog today + callAttempts = 1
          isFollowup: isFollowupCall,                // CallLog today + callAttempts > 1
          isOverdue: hadOverdueCallToday,            // CallLog today + scheduled followup < today
        },
      };
    });

    // Debug: Count leads by category
    const debugCounts = {
      total: transformedFilteredLeads.length,
      newLeads: transformedFilteredLeads.filter(l => l.activityFlags.isNewLead).length,
      followups: transformedFilteredLeads.filter(l => l.activityFlags.isFollowup).length,
      overdue: transformedFilteredLeads.filter(l => l.activityFlags.isOverdue).length,
      statusChanged: transformedFilteredLeads.filter(l => l.activityFlags.statusChangedToday).length,
    };
    console.log('[DSR Stats API] ===== LEAD CATEGORIZATION COUNTS =====');
    console.log('[DSR Stats API] Total leads returned:', debugCounts.total);
    console.log('[DSR Stats API] Leads with isNewLead=true:', debugCounts.newLeads);
    console.log('[DSR Stats API] Leads with isFollowup=true:', debugCounts.followups);
    console.log('[DSR Stats API] Leads with isOverdue=true:', debugCounts.overdue);
    console.log('[DSR Stats API] =====================================');

    // Calculate DSR metrics using the new service
    // NOTE: allCalls is already filtered by date at DB level
    // Pass dateRange for consistency in metrics calculation
    console.log('[DSR Stats API] Calculating metrics...');
    console.log('[DSR Stats API] Input counts: leads=' + allLeads.length + ', calls=' + allCalls.length + ', followups=' + allFollowups.length);
    const metrics = calculateDSRMetrics({
      leads: allLeads,
      followups: allFollowups,
      calls: allCalls, // Already date-filtered at DB level
      agentId: agentId || null,
      dateRange: (startDateParam || endDateParam) ? {
        startDate: startDateParam || undefined,
        endDate: endDateParam || undefined,
      } : undefined,
    });

    console.log('[DSR Stats API] Metrics calculated. Total Calls from DB-filtered data:', metrics.calls.total);

    // Calculate agent performance data with all required metrics
    // IMPORTANT: Use EXACT same logic as DSR KPIs but grouped by agent
    console.log('[DSR Stats API] Calculating agent performance...');
    const agentPerformanceData = await Promise.all(
      (agentId ? agents.filter(a => a.id === agentId) : agents).map(async (agent) => {
        console.log(`[DSR Stats API] Calculating metrics for agent: ${agent.name}`);
        
        // 1️⃣ Fetch calls made BY this agent (callerId) on selected date
        const agentCallsWhere: any = {
          callerId: agent.id, // ← Use callerId, not Lead.assignedToId
        };
        if (Object.keys(dateFilter).length > 0) {
          agentCallsWhere.createdAt = dateFilter;
        }
        
        const agentCalls = await prisma.callLog.findMany({
          where: agentCallsWhere,
          select: {
            id: true,
            leadId: true,
            attemptNumber: true,
            createdAt: true,
          },
        });

        // Get unique lead IDs from agent's calls
        const agentLeadIds = new Set(agentCalls.map(c => c.leadId));

        // 2️⃣ Fetch full lead data for these leads to check callAttempts
        const agentLeads = await prisma.lead.findMany({
          where: {
            id: { in: Array.from(agentLeadIds) },
          },
          select: {
            id: true,
            callAttempts: true,
            status: true,
            updatedAt: true,
          },
        });

        // Create a map of leadId -> Lead for quick lookup
        const leadMap = new Map(agentLeads.map(l => [l.id, l]));

        // 3️⃣ New Calls: Leads that had calls today AND callAttempts = 1
        const newLeads = agentLeads.filter(lead => 
          agentLeadIds.has(lead.id) && (lead.callAttempts || 0) === 1
        ).length;

        // 4️⃣ Follow-up Calls: Leads that had calls today AND callAttempts > 1
        const followUps = agentLeads.filter(lead => 
          agentLeadIds.has(lead.id) && (lead.callAttempts || 0) > 1
        ).length;

        // 5️⃣ Total Calls: All calls made by this agent on selected date
        const totalCalls = agentCalls.length;

        // 6️⃣ Fetch follow-ups for leads called by this agent
        const agentFollowups = await prisma.followUp.findMany({
          where: {
            leadId: { in: Array.from(agentLeadIds) },
          },
          select: {
            leadId: true,
            scheduledAt: true,
          },
        });

        // Build map of leadId -> most recent scheduled follow-up date
        const leadFollowupMap = new Map<string, Date>();
        agentFollowups.forEach(followup => {
          const scheduledDate = typeof followup.scheduledAt === 'string' 
            ? new Date(followup.scheduledAt) 
            : followup.scheduledAt;
          
          const existing = leadFollowupMap.get(followup.leadId);
          if (!existing || scheduledDate > existing) {
            leadFollowupMap.set(followup.leadId, scheduledDate);
          }
        });

        // 7️⃣ Overdue Calls Handled: Leads with calls on selected date where followup was overdue
        const overdueLeads = agentLeads.filter(lead => {
          if (!agentLeadIds.has(lead.id)) return false;
          
          const scheduledFollowup = leadFollowupMap.get(lead.id);
          if (!scheduledFollowup) return false;
          
          // Determine reference date
          let refDate: Date;
          if (endDateParam) {
            refDate = new Date(endDateParam);
            refDate.setHours(23, 59, 59, 999);
          } else {
            refDate = new Date();
          }
          
          return scheduledFollowup < refDate;
        }).length;

        // 8️⃣ Lead Outcome Metrics - Use assignedToId for outcomes
        const [won, lost, unreachable, unqualified] = await Promise.all([
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
          
          // Unqualified - leads marked unqualified by agent in date range
          prisma.lead.count({
            where: {
              assignedToId: agent.id,
              status: 'unqualified',
              ...(Object.keys(dateFilter).length > 0 && { updatedAt: dateFilter }),
            },
          }),
        ]);

        console.log(`[DSR Stats API] Agent ${agent.name}: newLeads=${newLeads}, followUps=${followUps}, totalCalls=${totalCalls}, overdue=${overdueLeads}`);

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
          unqualified,
          overdue: overdueLeads,
        };
      })
    );

    console.log('[DSR Stats API] Agent performance calculated. Preparing response...');

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          // CALLS PAGE METRICS (filtered by CallLog.createdAt = selected_date)
          // New Calls - attemptNumber = 1 on selected date
          newCallsCount: metrics.newLeads.handled,
          
          // Follow-up Calls - attemptNumber > 1 on selected date
          followupCallsCount: metrics.followups.handled,
          
          // Overdue Calls Handled - calls on selected date where previous_followup_date < selected_date
          overdueCallsHandled: metrics.overdueFollowups.total,
          
          // Total Calls - all calls made on selected date
          totalCalls: metrics.calls.total,
          
          // LEADS OUTCOME PAGE METRICS (filtered by Lead.updatedAt = selected_date)
          // Unqualified - status = 'unqualified' updated on selected date
          unqualified: metrics.unqualified.total,
          
          // Unreachable - status = 'unreachable' updated on selected date
          unreachable: metrics.unreachable.total,
          
          // Won - status = 'won' updated on selected date
          won: metrics.won.total,
          
          // Lost - status = 'lost' updated on selected date
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
