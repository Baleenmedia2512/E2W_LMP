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
 *   • New Calls: Unique leads with callAttempts = 1
 *   • Follow-up Calls: Unique leads with callAttempts > 1 AND NOT overdue
 *   • Overdue Calls Handled: Unique leads with previous_followup_date < selected_date
 *   • Total Calls: Unique leads called (New + Follow-up + Overdue = Total)
 *   NOTE: All metrics count unique leads; Follow-up and Overdue are mutually exclusive
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

    // ── Batch 1: all independent queries run in PARALLEL (was 6 sequential round-trips) ──────
    let allLeads: any[], allFollowups: any[], allCalls: any[];
    let leadsCreatedOnDate: any[], leadsUpdatedOnDate: any[], agents: any[];

    try {
      [allLeads, allFollowups, allCalls, leadsCreatedOnDate, leadsUpdatedOnDate, agents] = await Promise.all([
        // 1. All leads — no date filter needed; used for metrics + in-memory per-agent computation
        prisma.lead.findMany({
          where: agentId ? { assignedToId: agentId } : {},
          select: { id: true, status: true, createdAt: true, updatedAt: true, assignedToId: true, callAttempts: true },
        }),
        // 2. Active follow-ups (for overdue detection)
        prisma.followUp.findMany({
          where: agentId ? {
            status: { notIn: ['completed', 'cancelled'] },
            Lead: { assignedToId: agentId },
          } : {
            status: { notIn: ['completed', 'cancelled'] },
          },
          select: { id: true, leadId: true, scheduledAt: true, createdAt: true },
        }),
        // 3. Calls on selected date — also serves as callsOnDate; adds callerId for per-agent grouping
        prisma.callLog.findMany({
          where: callsWhere,
          select: { id: true, leadId: true, createdAt: true, attemptNumber: true, callStatus: true, callerId: true },
        }),
        // 4. Lead IDs created on selected date
        prisma.lead.findMany({
          where: { createdAt: dateFilter, ...(agentId && { assignedToId: agentId }) },
          select: { id: true },
        }),
        // 5. Lead IDs updated on selected date
        prisma.lead.findMany({
          where: { updatedAt: dateFilter, ...(agentId && { assignedToId: agentId }) },
          select: { id: true },
        }),
        // 6. Active agents
        prisma.user.findMany({
          where: { isActive: true },
          select: { id: true, name: true, email: true },
          orderBy: { name: 'asc' },
        }),
      ]);
    } catch (error) {
      console.error('[DSR Stats API] Error fetching data:', error);
      throw new Error('Failed to fetch DSR data');
    }

    // allCalls is already date-filtered — it IS callsOnDate (eliminates a redundant round-trip)
    const callsOnDate = allCalls;

    console.log('[DSR Stats API] Parallel batch — leads:', allLeads.length,
      '| followups:', allFollowups.length, '| calls:', allCalls.length, '| agents:', agents.length);

    // ── Batch 2: filteredLeads (depends on union of active lead IDs from Batch 1) ────────────
    const activeLeadIds = new Set([
      ...leadsCreatedOnDate.map((l: any) => l.id),
      ...callsOnDate.map((c: any) => c.leadId),
      ...leadsUpdatedOnDate.map((l: any) => l.id),
    ]);

    let filteredLeads: any[];
    try {
      filteredLeads = await prisma.lead.findMany({
        where: { id: { in: Array.from(activeLeadIds) } },
        include: {
          User_Lead_assignedToIdToUser: { select: { id: true, name: true, email: true } },
          User_Lead_createdByIdToUser: { select: { id: true, name: true, email: true } },
          CallLog: {
            where: { createdAt: dateFilter },
            orderBy: { createdAt: 'desc' },
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

    // Build a SET of lead IDs that have ANY active follow-up scheduled before the reference date.
    // CRITICAL: Must use .some() (any overdue follow-up), NOT just the latest/most-recent follow-up.
    // Using only the latest follow-up would miss leads that have BOTH an old overdue follow-up
    // AND a future scheduled follow-up — causing KPI count vs table row count mismatches.
    const overdueReferenceDate = (() => {
      if (startDateParam) {
        const d = new Date(startDateParam);
        d.setHours(0, 0, 0, 0);
        return d;
      }
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    })();

    // Group follow-ups by leadId for quick lookup
    const followupsByLeadId = new Map<string, Date[]>();
    allFollowups.forEach((followup: any) => {
      const scheduledDate = typeof followup.scheduledAt === 'string'
        ? new Date(followup.scheduledAt)
        : followup.scheduledAt;
      const existing = followupsByLeadId.get(followup.leadId) || [];
      existing.push(scheduledDate);
      followupsByLeadId.set(followup.leadId, existing);
    });

    // A lead is "overdue" if it has ANY active follow-up scheduled before the reference date
    const overdueLeadIds = new Set<string>();
    followupsByLeadId.forEach((dates, leadId) => {
      if (dates.some(d => d < overdueReferenceDate)) {
        overdueLeadIds.add(leadId);
      }
    });

    // Transform filteredLeads to match frontend expectations and add activity metadata
    // CRITICAL: These flags MUST match the exact KPI logic for perfect count matching
    const transformedFilteredLeads = filteredLeads.map((lead: any) => {
      const wasCreatedToday = Object.keys(dateFilter).length > 0 && 
        leadsCreatedOnDate.some((l: any) => l.id === lead.id);
      const hadCallToday = callsOnDate.some((c: any) => c.leadId === lead.id);
      const wasUpdatedToday = leadsUpdatedOnDate.some((l: any) => l.id === lead.id);
      
      // Get all calls for this lead on the selected date
      const leadsCallsToday = callsOnDate.filter((c: any) => c.leadId === lead.id);
      
      // ===== EXACT KPI LOGIC IMPLEMENTATION =====
      
      // 1️⃣ New Calls: CallLog.createdAt = selected_date AND Lead.callAttempts = 1
      // A lead is "New Call" if it had a call today AND its callAttempts field = 1
      const isNewCall = hadCallToday && (lead.callAttempts || 0) === 1;
      
      // 4️⃣ Overdue Calls Handled: CallLog.createdAt = selected_date AND lead has ANY follow-up before selected_date
      // Uses the overdueLeadIds set (built with .some() logic) to match calculateDSRMetrics exactly
      const hadOverdueCallToday = hadCallToday && overdueLeadIds.has(lead.id);
      
      // 2️⃣ Follow-Up Calls: CallLog.createdAt = selected_date AND NOT new AND NOT overdue (catchall)
      // Changed from: callAttempts > 1 AND NOT overdue
      // To: callAttempts !== 1 AND NOT overdue (catches ALL non-new, non-overdue calls)
      // This ensures New + Follow-up + Overdue = Total Calls (mutually exclusive categories)
      const isFollowupCall = hadCallToday && (lead.callAttempts || 0) !== 1 && !hadOverdueCallToday;
      
      // 3️⃣ Total Calls: CallLog.createdAt = selected_date
      // Any lead that had a call today (already captured in hadCallToday)
      
      // 5️⃣-8️⃣ Status-based outcomes: Lead.status = X AND Lead.updatedAt = selected_date
      // These are already captured in wasUpdatedToday flag + lead.status
      
      // Debug logging
      if (hadCallToday) {
        console.log(`[DSR Transform] Lead ${lead.name}: callAttempts=${lead.callAttempts}, isNew=${isNewCall}, isFollowup=${isFollowupCall}, isOverdue=${hadOverdueCallToday}`);
      }
      
      // Get the most recent call log remarks from today's calls
      const mostRecentCallRemarks = lead.CallLog && lead.CallLog.length > 0 
        ? lead.CallLog[0].remarks 
        : null;
      
      // Get the nearest FUTURE follow-up date for this lead
      const leadFollowupDates = followupsByLeadId.get(lead.id) || [];
      const now = new Date();
      const futureFollowups = leadFollowupDates.filter(d => d >= now).sort((a, b) => a.getTime() - b.getTime());
      const nextFollowupAt = futureFollowups.length > 0 ? futureFollowups[0].toISOString() : null;

      return {
        ...lead,
        assignedTo: lead.User_Lead_assignedToIdToUser,
        createdBy: lead.User_Lead_createdByIdToUser,
        callLogRemarks: mostRecentCallRemarks,  // Add call log remarks
        nextFollowupAt,
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
      newLeads: transformedFilteredLeads.filter((l: any) => l.activityFlags.isNewLead).length,
      followups: transformedFilteredLeads.filter((l: any) => l.activityFlags.isFollowup).length,
      overdue: transformedFilteredLeads.filter((l: any) => l.activityFlags.isOverdue).length,
      statusChanged: transformedFilteredLeads.filter((l: any) => l.activityFlags.statusChangedToday).length,
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

    // ── Agent performance: computed from in-memory data — zero extra DB queries ──────────────
    console.log('[DSR Stats API] Calculating agent performance (in-memory)...');

    const dateStart: Date | undefined = (dateFilter as any).gte;
    const dateEnd: Date | undefined = (dateFilter as any).lte;
    const inDateRange = (date: Date | string): boolean => {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (dateStart && d < dateStart) return false;
      if (dateEnd && d > dateEnd) return false;
      return true;
    };

    const agentPerformanceData = (agentId ? agents.filter((a: any) => a.id === agentId) : agents).map((agent: any) => {
      // Calls made BY this agent on selected date (callerId added to allCalls select in Batch 1)
      const agentCalls = allCalls.filter((c: any) => c.callerId === agent.id);
      const agentLeadIds = new Set(agentCalls.map((c: any) => c.leadId));

      // Leads called by this agent — check callAttempts from already-fetched allLeads
      const agentLeadsForCalls = allLeads.filter((l: any) => agentLeadIds.has(l.id));

      // Overdue detection: reuse global followupsByLeadId + overdueReferenceDate already in scope
      const agentOverdueLeadIds = new Set<string>();
      agentLeadIds.forEach((leadId: string) => {
        const dates = followupsByLeadId.get(leadId) || [];
        if (dates.some((d: Date) => d < overdueReferenceDate)) {
          agentOverdueLeadIds.add(leadId);
        }
      });

      const newLeads = agentLeadsForCalls.filter((l: any) => (l.callAttempts || 0) === 1).length;
      const totalCalls = agentCalls.length;
      const overdueLeadsCount = agentOverdueLeadIds.size;
      const followUps = agentLeadsForCalls.filter((l: any) =>
        (l.callAttempts || 0) > 1 && !agentOverdueLeadIds.has(l.id)
      ).length;

      // Outcome metrics: leads ASSIGNED to this agent whose status changed in date range
      const agentLeadsForOutcomes = allLeads.filter((l: any) =>
        l.assignedToId === agent.id && inDateRange(l.updatedAt)
      );
      const won = agentLeadsForOutcomes.filter((l: any) => l.status === 'won').length;
      const lost = agentLeadsForOutcomes.filter((l: any) => l.status === 'lost').length;
      const unreachable = agentLeadsForOutcomes.filter((l: any) => l.status === 'unreach').length;
      const unqualified = agentLeadsForOutcomes.filter((l: any) => l.status === 'unqualified').length;

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
        overdue: overdueLeadsCount,
      };
    });

    console.log('[DSR Stats API] Agent performance calculated. Preparing response...');

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          // CALLS PAGE METRICS (filtered by CallLog.createdAt = selected_date)
          // All metrics count UNIQUE LEADS (not call records)
          // New Calls - unique leads with callAttempts = 1
          newCallsCount: metrics.newLeads.handled,
          
          // Follow-up Calls - unique leads with callAttempts > 1 (not overdue)
          followupCallsCount: metrics.followups.handled,
          
          // Overdue Calls Handled - unique leads with previous_followup_date < selected_date
          overdueCallsHandled: metrics.overdueFollowups.total,
          
          // Total Calls - unique leads called (New + Follow-up + Overdue = Total)
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
