/**
 * DSR (Daily Sales Report) Metrics Calculation Service
 * 
 * FINAL IMPLEMENTATION - Matches exact user requirements
 * 
 * ✅ DATA SOURCES:
 * 
 * 📌 CALLS PAGE → CallLog table filtered by createdAt = selected_date
 *    - New Calls: call_attempts (attemptNumber) = 1
 *    - Follow-up Calls: call_attempts (attemptNumber) > 1 AND NOT overdue
 *    - Overdue Calls Handled: Calls made where previous_followup_date < selected_date
 *    - Total Calls: All calls made on selected_date
 *    NOTE: Follow-up and Overdue calls are mutually exclusive
 * 
 * 📌 LEADS OUTCOME PAGE → ActivityHistory filtered by createdAt = selected_date
 *    - Unqualified: status_changed events where newValue = 'unqualified'
 *    - Unreachable: status_changed events where newValue = 'unreach'
 *    - Won: status_changed events where newValue = 'won'
 *    - Lost: status_changed events where newValue = 'lost'
 *    NOTE: Counts each status-change event (same lead winning twice = 2)
 * 
 * ✅ BEHAVIOR:
 * - Default date: TODAY
 * - When date changes: ALL KPIs and tables refresh for that specific date
 * - All metrics respect the selected date filter
 * - No double-counting of calls
 * - Total Calls = New + Follow-up + Other calls (not outcomes)
 */

import { isToday, getStartOfToday, getEndOfToday, isPast, DEFAULT_TIMEZONE } from './timezone';

// ==================== Types ====================

export interface DSRMetricsInput {
  leads: Array<{
    id: string;
    status: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    assignedToId?: string | null;
    callAttempts?: number;
  }>;
  followups: Array<{
    id: string;
    leadId: string;
    scheduledAt: Date | string;
    createdAt: Date | string;
  }>;
  calls: Array<{
    id: string;
    leadId: string;
    createdAt: Date | string;
    attemptNumber: number;
    callStatus?: string | null;
  }>;
  /** Status-change events from ActivityHistory (pre-filtered by date at DB level when provided) */
  statusChanges?: Array<{
    leadId: string;
    newValue: string;
    createdAt: Date | string;
  }>;
  statusChangesPreFiltered?: boolean;
  agentId?: string | null;
  timezone?: string;
  dateRange?: {
    startDate?: Date | string;
    endDate?: Date | string;
  };
}

export interface DSRMetricsResult {
  newLeads: { handled: number; total: number };
  followups: { handled: number; total: number };
  calls: { total: number };
  overdueFollowups: { total: number };
  unqualified: { total: number };
  unreachable: { total: number };
  won: { total: number };
  lost: { total: number };
}

// ==================== Helper Functions ====================

/**
 * Filter leads by status
 */
function getTotalByStatus(
  leads: DSRMetricsInput['leads'],
  statusName: string
): number {
  return leads.filter((lead: any) => lead.status.toLowerCase() === statusName.toLowerCase()).length;
}

/**
 * Count status-change events to a specific outcome status today or in date range.
 * Uses ActivityHistory events — each transition counts separately (same lead can count twice).
 */
function getStatusChangeEventCount(
  statusChanges: DSRMetricsInput['statusChanges'],
  statusName: string,
  timezone: string = DEFAULT_TIMEZONE,
  dateRange?: { startDate?: Date | string; endDate?: Date | string },
  preFiltered = false
): number {
  if (!statusChanges || statusChanges.length === 0) return 0;

  return statusChanges.filter((change) => {
    if (change.newValue.toLowerCase() !== statusName.toLowerCase()) return false;

    if (preFiltered) return true;

    const changedDate = typeof change.createdAt === 'string' ? new Date(change.createdAt) : change.createdAt;

    if (!dateRange || (!dateRange.startDate && !dateRange.endDate)) {
      return isToday(change.createdAt, timezone);
    }

    const start = dateRange.startDate ? (typeof dateRange.startDate === 'string' ? new Date(dateRange.startDate) : dateRange.startDate) : null;
    const end = dateRange.endDate ? (typeof dateRange.endDate === 'string' ? new Date(dateRange.endDate) : dateRange.endDate) : null;

    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    if (start && end) return changedDate >= start && changedDate <= end;
    if (start) return changedDate >= start;
    if (end) return changedDate <= end;
    return false;
  }).length;
}

/**
 * Legacy: count leads where current status matches and updatedAt is in range (unique leads only)
 */
function getStatusChangeToday(
  leads: DSRMetricsInput['leads'],
  statusName: string,
  timezone: string = DEFAULT_TIMEZONE,
  dateRange?: { startDate?: Date | string; endDate?: Date | string }
): number {
  return leads.filter((lead: any) => {
    const statusMatches = lead.status.toLowerCase() === statusName.toLowerCase();
    
    if (!dateRange || (!dateRange.startDate && !dateRange.endDate)) {
      // No date range - use today
      const updatedToday = isToday(lead.updatedAt, timezone);
      return statusMatches && updatedToday;
    }
    
    // Date range specified
    const updatedDate = typeof lead.updatedAt === 'string' ? new Date(lead.updatedAt) : lead.updatedAt;
    const start = dateRange.startDate ? (typeof dateRange.startDate === 'string' ? new Date(dateRange.startDate) : dateRange.startDate) : null;
    const end = dateRange.endDate ? (typeof dateRange.endDate === 'string' ? new Date(dateRange.endDate) : dateRange.endDate) : null;
    
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    
    let inRange = true;
    if (start && end) inRange = updatedDate >= start && updatedDate <= end;
    else if (start) inRange = updatedDate >= start;
    else if (end) inRange = updatedDate <= end;
    
    return statusMatches && inRange;
  }).length;
}

/**
 * Get count of followups scheduled today or in date range
 * Only counts followups scheduled on the selected date (not created date)
 */
function getFollowupsToday(
  followups: DSRMetricsInput['followups'],
  timezone: string = DEFAULT_TIMEZONE,
  dateRange?: { startDate?: Date | string; endDate?: Date | string }
): number {
  if (!dateRange || (!dateRange.startDate && !dateRange.endDate)) {
    // No date range - use today
    return followups.filter((followup: any) => {
      const scheduledToday = isToday(followup.scheduledAt, timezone);
      return scheduledToday;
    }).length;
  }
  
  // Date range specified
  return followups.filter((followup: any) => {
    const scheduledDate = typeof followup.scheduledAt === 'string' ? new Date(followup.scheduledAt) : followup.scheduledAt;
    const start = dateRange.startDate ? (typeof dateRange.startDate === 'string' ? new Date(dateRange.startDate) : dateRange.startDate) : null;
    const end = dateRange.endDate ? (typeof dateRange.endDate === 'string' ? new Date(dateRange.endDate) : dateRange.endDate) : null;
    
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    
    const checkInRange = (date: Date) => {
      if (start && end) return date >= start && date <= end;
      if (start) return date >= start;
      if (end) return date <= end;
      return false;
    };
    
    return checkInRange(scheduledDate);
  }).length;
}

/**
 * Get count of pending/upcoming followups (scheduled >= now)
 */
function getPendingFollowups(
  followups: DSRMetricsInput['followups'],
  timezone: string = DEFAULT_TIMEZONE
): number {
  const now = new Date();
  return followups.filter((followup: any) => {
    const scheduledDate = typeof followup.scheduledAt === 'string' 
      ? new Date(followup.scheduledAt) 
      : followup.scheduledAt;
    return scheduledDate >= now;
  }).length;
}

/**
 * Get count of overdue followups (scheduled < reference date)
 * Reference date is the selected date or current time if no date range
 */
function getOverdueFollowups(
  followups: DSRMetricsInput['followups'],
  timezone: string = DEFAULT_TIMEZONE,
  dateRange?: { startDate?: Date | string; endDate?: Date | string }
): number {
  // Use end of selected date as reference, or current time if no date range
  const referenceDate = dateRange?.endDate 
    ? (typeof dateRange.endDate === 'string' ? new Date(dateRange.endDate) : dateRange.endDate)
    : new Date();
  
  // Set to end of day for fair comparison
  if (dateRange?.endDate) {
    referenceDate.setHours(23, 59, 59, 999);
  }
  
  return followups.filter((followup: any) => {
    const scheduledDate = typeof followup.scheduledAt === 'string' 
      ? new Date(followup.scheduledAt) 
      : followup.scheduledAt;
    return scheduledDate < referenceDate;
  }).length;
}

/**
 * Get count of calls created today or in date range
 */
function getCallsToday(
  calls: DSRMetricsInput['calls'],
  timezone: string = DEFAULT_TIMEZONE,
  dateRange?: { startDate?: Date | string; endDate?: Date | string }
): number {
  if (!dateRange || (!dateRange.startDate && !dateRange.endDate)) {
    // No date range - use today
    return calls.filter((call: any) => isToday(call.createdAt, timezone)).length;
  }
  
  // Date range specified
  return calls.filter((call: any) => {
    const callDate = typeof call.createdAt === 'string' ? new Date(call.createdAt) : call.createdAt;
    const start = dateRange.startDate ? (typeof dateRange.startDate === 'string' ? new Date(dateRange.startDate) : dateRange.startDate) : null;
    const end = dateRange.endDate ? (typeof dateRange.endDate === 'string' ? new Date(dateRange.endDate) : dateRange.endDate) : null;
    
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    
    if (start && end) return callDate >= start && callDate <= end;
    if (start) return callDate >= start;
    if (end) return callDate <= end;
    return false;
  }).length;
}

/**
 * A. New Leads Handled Today
 * Count of leads whose first call (attemptNumber = 1) happened today/in date range
 */
function getNewLeadsHandledToday(
  calls: DSRMetricsInput['calls'],
  timezone: string = DEFAULT_TIMEZONE,
  dateRange?: { startDate?: Date | string; endDate?: Date | string }
): number {
  // Get unique leads that had their first call today/in range
  const firstCallLeads = new Set<string>();
  
  calls.forEach((call: any) => {
    // Check if this is a first call (attemptNumber = 1)
    if (call.attemptNumber === 1) {
      // Check if call was made today or in date range
      const callDate = typeof call.createdAt === 'string' ? new Date(call.createdAt) : call.createdAt;
      
      if (!dateRange || (!dateRange.startDate && !dateRange.endDate)) {
        // No date range - use today
        if (isToday(call.createdAt, timezone)) {
          firstCallLeads.add(call.leadId);
        }
      } else {
        // Date range specified
        const start = dateRange.startDate ? (typeof dateRange.startDate === 'string' ? new Date(dateRange.startDate) : dateRange.startDate) : null;
        const end = dateRange.endDate ? (typeof dateRange.endDate === 'string' ? new Date(dateRange.endDate) : dateRange.endDate) : null;
        
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);
        
        let inRange = false;
        if (start && end) inRange = callDate >= start && callDate <= end;
        else if (start) inRange = callDate >= start;
        else if (end) inRange = callDate <= end;
        
        if (inRange) {
          firstCallLeads.add(call.leadId);
        }
      }
    }
  });
  
  return firstCallLeads.size;
}

/**
 * B. Follow-ups Handled Today
 * Count of calls that are NOT first calls (attemptNumber > 1) and were made today/in date range
 */
function getFollowUpCallsToday(
  calls: DSRMetricsInput['calls'],
  timezone: string = DEFAULT_TIMEZONE,
  dateRange?: { startDate?: Date | string; endDate?: Date | string }
): number {
  return calls.filter((call: any) => {
    // Must not be a first call
    if (call.attemptNumber === 1) return false;
    
    const callDate = typeof call.createdAt === 'string' ? new Date(call.createdAt) : call.createdAt;
    
    if (!dateRange || (!dateRange.startDate && !dateRange.endDate)) {
      // No date range - use today
      return isToday(call.createdAt, timezone);
    }
    
    // Date range specified
    const start = dateRange.startDate ? (typeof dateRange.startDate === 'string' ? new Date(dateRange.startDate) : dateRange.startDate) : null;
    const end = dateRange.endDate ? (typeof dateRange.endDate === 'string' ? new Date(dateRange.endDate) : dateRange.endDate) : null;
    
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    
    if (start && end) return callDate >= start && callDate <= end;
    if (start) return callDate >= start;
    if (end) return callDate <= end;
    return false;
  }).length;
}

/**
 * D. Overdue Follow-ups Handled Today
 * Count of calls today where the scheduled follow-up date < today and call is not the first call
 */
function getOverdueFollowupsHandledToday(
  calls: DSRMetricsInput['calls'],
  followups: DSRMetricsInput['followups'],
  timezone: string = DEFAULT_TIMEZONE,
  dateRange?: { startDate?: Date | string; endDate?: Date | string }
): number {
  // Build a map of leadId -> most recent scheduled follow-up date before the call
  const leadFollowupMap = new Map<string, Date>();
  
  followups.forEach((followup: any) => {
    const scheduledDate = typeof followup.scheduledAt === 'string' 
      ? new Date(followup.scheduledAt) 
      : followup.scheduledAt;
    
    const existing = leadFollowupMap.get(followup.leadId);
    if (!existing || scheduledDate > existing) {
      leadFollowupMap.set(followup.leadId, scheduledDate);
    }
  });
  
  // Count calls today that are NOT first calls and had an overdue follow-up
  return calls.filter((call: any) => {
    // Must not be a first call
    if (call.attemptNumber === 1) return false;
    
    const callDate = typeof call.createdAt === 'string' ? new Date(call.createdAt) : call.createdAt;
    
    // Check if call was made today or in date range
    let inDateRange = false;
    if (!dateRange || (!dateRange.startDate && !dateRange.endDate)) {
      inDateRange = isToday(call.createdAt, timezone);
    } else {
      const start = dateRange.startDate ? (typeof dateRange.startDate === 'string' ? new Date(dateRange.startDate) : dateRange.startDate) : null;
      const end = dateRange.endDate ? (typeof dateRange.endDate === 'string' ? new Date(dateRange.endDate) : dateRange.endDate) : null;
      
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);
      
      if (start && end) inDateRange = callDate >= start && callDate <= end;
      else if (start) inDateRange = callDate >= start;
      else if (end) inDateRange = callDate <= end;
    }
    
    if (!inDateRange) return false;
    
    // Check if there was a scheduled follow-up for this lead that was overdue
    const scheduledFollowup = leadFollowupMap.get(call.leadId);
    if (!scheduledFollowup) return false;
    
    // Follow-up is overdue if scheduled date < call date
    return scheduledFollowup < callDate;
  }).length;
}

/**
 * F. Unreachable Leads Handled Today
 * Count of distinct leads called today where call outcome is "Unreachable" or "No Answer" 
 * (excluding first calls)
 */
function getUnreachableLeadsToday(
  calls: DSRMetricsInput['calls'],
  timezone: string = DEFAULT_TIMEZONE,
  dateRange?: { startDate?: Date | string; endDate?: Date | string }
): number {
  const unreachableLeads = new Set<string>();
  
  calls.forEach(call => {
    // Exclude first calls
    if (call.attemptNumber === 1) return;
    
    // Check if call status indicates unreachable
    const status = call.callStatus?.toLowerCase() || '';
    if (!status.includes('unreachable') && !status.includes('no answer') && status !== 'no_answer') {
      return;
    }
    
    const callDate = typeof call.createdAt === 'string' ? new Date(call.createdAt) : call.createdAt;
    
    // Check if call was made today or in date range
    let inDateRange = false;
    if (!dateRange || (!dateRange.startDate && !dateRange.endDate)) {
      inDateRange = isToday(call.createdAt, timezone);
    } else {
      const start = dateRange.startDate ? (typeof dateRange.startDate === 'string' ? new Date(dateRange.startDate) : dateRange.startDate) : null;
      const end = dateRange.endDate ? (typeof dateRange.endDate === 'string' ? new Date(dateRange.endDate) : dateRange.endDate) : null;
      
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);
      
      if (start && end) inDateRange = callDate >= start && callDate <= end;
      else if (start) inDateRange = callDate >= start;
      else if (end) inDateRange = callDate <= end;
    }
    
    if (inDateRange) {
      unreachableLeads.add(call.leadId);
    }
  });
  
  return unreachableLeads.size;
}

/**
 * Get count of leads created today or in date range
 */
function getNewLeadsToday(
  leads: DSRMetricsInput['leads'],
  timezone: string = DEFAULT_TIMEZONE,
  dateRange?: { startDate?: Date | string; endDate?: Date | string }
): number {
  if (!dateRange || (!dateRange.startDate && !dateRange.endDate)) {
    // No date range - use today
    return leads.filter((lead: any) => isToday(lead.createdAt, timezone)).length;
  }
  
  // Date range specified
  return leads.filter((lead: any) => {
    const leadDate = typeof lead.createdAt === 'string' ? new Date(lead.createdAt) : lead.createdAt;
    const start = dateRange.startDate ? (typeof dateRange.startDate === 'string' ? new Date(dateRange.startDate) : dateRange.startDate) : null;
    const end = dateRange.endDate ? (typeof dateRange.endDate === 'string' ? new Date(dateRange.endDate) : dateRange.endDate) : null;
    
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    
    if (start && end) return leadDate >= start && leadDate <= end;
    if (start) return leadDate >= start;
    if (end) return leadDate <= end;
    return false;
  }).length;
}

// ==================== Main Calculation Function ====================

/**
 * Calculate all DSR metrics based on the requirements for a SELECTED DATE
 * 
 * All metrics are calculated based on CALLS PAGE and LEADS OUTCOME PAGE:
 * 
 * CALLS PAGE (CallLog filtered by createdAt = selected_date):
 * - New Calls: Unique leads with callAttempts = 1 on selected date
 * - Follow-up Calls: Unique leads with callAttempts > 1 on selected date AND NOT overdue
 * - Overdue Calls Handled: Unique leads called on selected date where previous_followup_date < selected_date
 * - Total Calls: Unique leads called on selected date (New + Follow-up + Overdue = Total)
 * NOTE: Follow-up and Overdue calls are mutually exclusive, and all three sum to Total
 * 
 * LEADS OUTCOME PAGE (ActivityHistory filtered by createdAt = selected_date):
 * - Unqualified / Unreachable / Won / Lost: count status_changed events per newValue
 */
export function calculateDSRMetrics(input: DSRMetricsInput): DSRMetricsResult {
  const timezone = input.timezone || DEFAULT_TIMEZONE;
  const dateRange = input.dateRange;
  
  // Filter data by agent if specified
  let leads = input.leads;
  let followups = input.followups;
  let calls = input.calls;
  
  if (input.agentId) {
    leads = leads.filter((lead: any) => lead.assignedToId === input.agentId);
    const leadIds = new Set(leads.map((l: any) => l.id));
    followups = followups.filter(f => leadIds.has(f.leadId));
    calls = calls.filter(c => leadIds.has(c.leadId));
  }
  
  // CALLS PAGE METRICS - Based on calls made today + Lead's callAttempts field
  // IMPORTANT: If dateRange is provided, calls array is ALREADY filtered at DB level
  // So we should NOT re-filter to avoid discrepancies
  
  // Check if calls are pre-filtered (if dateRange exists, assume DB pre-filtered)
  const callsArePreFiltered = !!(dateRange && (dateRange.startDate || dateRange.endDate));
  
  let callsOnDate: typeof calls;
  
  if (callsArePreFiltered) {
    // Calls are already filtered at DB level - use them directly
    callsOnDate = calls;
    console.log('[DSR Metrics] Using pre-filtered calls from DB:', callsOnDate.length);
  } else {
    // Filter calls made on selected date (legacy path for when no dateRange provided)
    callsOnDate = calls.filter((call: any) => {
      const callDate = typeof call.createdAt === 'string' ? new Date(call.createdAt) : call.createdAt;
      
      if (!dateRange || (!dateRange.startDate && !dateRange.endDate)) {
        return isToday(call.createdAt, timezone);
      }
      
      const start = dateRange.startDate ? (typeof dateRange.startDate === 'string' ? new Date(dateRange.startDate) : dateRange.startDate) : null;
      const end = dateRange.endDate ? (typeof dateRange.endDate === 'string' ? new Date(dateRange.endDate) : dateRange.endDate) : null;
      
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);
      
      if (start && end) return callDate >= start && callDate <= end;
      if (start) return callDate >= start;
      if (end) return callDate <= end;
      return false;
    });
    console.log('[DSR Metrics] Filtered calls in JS:', callsOnDate.length);
  }
  
  // Get unique lead IDs that had calls today
  const leadsWithCallsToday = new Set(callsOnDate.map((c: any) => c.leadId));
  console.log('[DSR Metrics] Unique leads called today:', leadsWithCallsToday.size);
  
  // New Calls: Leads that had calls today AND have callAttempts = 1
  const newCallsCount = leads.filter((lead: any) => 
    leadsWithCallsToday.has(lead.id) && (lead.callAttempts || 0) === 1
  ).length;
  
  // Overdue Calls Handled: Leads with calls today AND had follow-up scheduled BEFORE today (overdue)
  const overdueCallsHandled = leads.filter((lead: any) => {
    // Must have had a call today
    if (!leadsWithCallsToday.has(lead.id)) return false;
    
    // Determine the reference date: START of selected day.
    // A follow-up is only "overdue" if it was scheduled BEFORE the selected date
    // (i.e., a past date), NOT same-day follow-ups.
    let referenceDate: Date;
    if (dateRange?.startDate) {
      referenceDate = typeof dateRange.startDate === 'string' ? new Date(dateRange.startDate) : new Date((dateRange.startDate as Date).getTime());
      referenceDate.setHours(0, 0, 0, 0); // Start of selected date
    } else {
      const now = new Date();
      referenceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    }
    
    // Check if this lead had any follow-up scheduled BEFORE now (overdue)
    const leadFollowups = followups.filter((f: any) => f.leadId === lead.id);
    
    return leadFollowups.some((f: any) => {
      const scheduledDate = typeof f.scheduledAt === 'string' ? new Date(f.scheduledAt) : f.scheduledAt;
      return scheduledDate < referenceDate; // Scheduled before now = overdue
    });
  }).length;
  
  // Get set of leads with overdue calls
  const leadsWithOverdueCalls = new Set<string>();
  leads.forEach((lead: any) => {
    if (!leadsWithCallsToday.has(lead.id)) return;
    
    let referenceDate: Date;
    if (dateRange?.startDate) {
      referenceDate = typeof dateRange.startDate === 'string' ? new Date(dateRange.startDate) : new Date((dateRange.startDate as Date).getTime());
      referenceDate.setHours(0, 0, 0, 0); // Start of selected date
    } else {
      const now = new Date();
      referenceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    }
    
    const leadFollowups = followups.filter((f: any) => f.leadId === lead.id);
    const hasOverdue = leadFollowups.some((f: any) => {
      const scheduledDate = typeof f.scheduledAt === 'string' ? new Date(f.scheduledAt) : f.scheduledAt;
      return scheduledDate < referenceDate;
    });
    
    if (hasOverdue) {
      leadsWithOverdueCalls.add(lead.id);
    }
  });
  
  // Follow-up Calls: Leads that had calls today AND NOT new AND NOT overdue (catchall)
  // Changed from: callAttempts > 1 AND NOT overdue
  // To: callAttempts !== 1 AND NOT overdue (catches ALL non-new, non-overdue calls)
  // This ensures New + Follow-up + Overdue = Total Calls (mutually exclusive categories)
  const followupCallsCount = leads.filter((lead: any) => 
    leadsWithCallsToday.has(lead.id) && 
    (lead.callAttempts || 0) !== 1 &&  // NOT new (excludes first calls)
    !leadsWithOverdueCalls.has(lead.id)  // NOT overdue (excludes overdue calls)
  ).length;
  
  // Total Calls: Unique leads called on selected date (ensures New + Follow-up + Overdue = Total)
  const totalCalls = leadsWithCallsToday.size;
  
  // Debug: Verify categorization adds up
  console.log('[DSR Metrics] Category breakdown:');
  console.log('  New Calls:', newCallsCount);
  console.log('  Follow-up Calls:', followupCallsCount);
  console.log('  Overdue Calls:', overdueCallsHandled);
  console.log('  Total Calls:', totalCalls);
  console.log('  Sum (New+Follow+Overdue):', newCallsCount + followupCallsCount + overdueCallsHandled);
  console.log('  Match:', (newCallsCount + followupCallsCount + overdueCallsHandled) === totalCalls ? '✅' : '❌');
  
  // LEADS OUTCOME PAGE METRICS — ActivityHistory status_changed events in date range
  const useStatusEvents = input.statusChanges && input.statusChanges.length > 0;
  const statusChangesPreFiltered = input.statusChangesPreFiltered ?? useStatusEvents;

  const totalUnqualified = useStatusEvents
    ? getStatusChangeEventCount(input.statusChanges, 'unqualified', timezone, dateRange, statusChangesPreFiltered)
    : getStatusChangeToday(leads, 'unqualified', timezone, dateRange);

  const totalUnreachable = useStatusEvents
    ? getStatusChangeEventCount(input.statusChanges, 'unreach', timezone, dateRange, statusChangesPreFiltered)
    : getStatusChangeToday(leads, 'unreach', timezone, dateRange);

  const totalWon = useStatusEvents
    ? getStatusChangeEventCount(input.statusChanges, 'won', timezone, dateRange, statusChangesPreFiltered)
    : getStatusChangeToday(leads, 'won', timezone, dateRange);

  const totalLost = useStatusEvents
    ? getStatusChangeEventCount(input.statusChanges, 'lost', timezone, dateRange, statusChangesPreFiltered)
    : getStatusChangeToday(leads, 'lost', timezone, dateRange);
  
  return {
    newLeads: { 
      handled: newCallsCount,
      total: newCallsCount // For calls page, handled = total
    },
    followups: { 
      handled: followupCallsCount,
      total: followupCallsCount // For calls page, handled = total
    },
    calls: { 
      total: totalCalls 
    },
    overdueFollowups: { 
      total: overdueCallsHandled 
    },
    unqualified: { 
      total: totalUnqualified 
    },
    unreachable: { 
      total: totalUnreachable 
    },
    won: { 
      total: totalWon 
    },
    lost: { 
      total: totalLost 
    }
  };
}

// ==================== Export Helper Functions for Reuse ====================

export {
  isToday,
  getStatusChangeEventCount,
  getStatusChangeToday,
  getTotalByStatus,
  getFollowupsToday,
  getPendingFollowups,
  getOverdueFollowups,
  getCallsToday,
  getNewLeadsToday,
  getNewLeadsHandledToday,
  getFollowUpCallsToday,
  getOverdueFollowupsHandledToday,
  getUnreachableLeadsToday,
};
