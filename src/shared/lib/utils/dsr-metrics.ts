/**
 * DSR (Daily Sales Report) Metrics Calculation Service
 * 
 * FINAL IMPLEMENTATION - Matches exact user requirements
 * 
 * ✅ DATA SOURCES:
 * 
 * 📌 CALLS PAGE → CallLog table filtered by createdAt = selected_date
 *    - New Calls: call_attempts (attemptNumber) = 1
 *    - Follow-up Calls: call_attempts (attemptNumber) > 1
 *    - Overdue Calls Handled: Calls made where previous_followup_date < selected_date
 *    - Total Calls: All calls made on selected_date
 * 
 * 📌 LEADS OUTCOME PAGE → Lead table filtered by updatedAt = selected_date
 *    - Unqualified: status = 'unqualified' updated on selected_date
 *    - Unreachable: status = 'unreach' updated on selected_date
 *    - Won: status = 'won' updated on selected_date
 *    - Lost: status = 'lost' updated on selected_date
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
  return leads.filter(lead => lead.status.toLowerCase() === statusName.toLowerCase()).length;
}

/**
 * Get leads where status changed to a specific status today or in date range
 * This checks if updatedAt is in range AND current status matches
 */
function getStatusChangeToday(
  leads: DSRMetricsInput['leads'],
  statusName: string,
  timezone: string = DEFAULT_TIMEZONE,
  dateRange?: { startDate?: Date | string; endDate?: Date | string }
): number {
  return leads.filter(lead => {
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
    return followups.filter(followup => {
      const scheduledToday = isToday(followup.scheduledAt, timezone);
      return scheduledToday;
    }).length;
  }
  
  // Date range specified
  return followups.filter(followup => {
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
  return followups.filter(followup => {
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
  
  return followups.filter(followup => {
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
    return calls.filter(call => isToday(call.createdAt, timezone)).length;
  }
  
  // Date range specified
  return calls.filter(call => {
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
  
  calls.forEach(call => {
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
  return calls.filter(call => {
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
  
  followups.forEach(followup => {
    const scheduledDate = typeof followup.scheduledAt === 'string' 
      ? new Date(followup.scheduledAt) 
      : followup.scheduledAt;
    
    const existing = leadFollowupMap.get(followup.leadId);
    if (!existing || scheduledDate > existing) {
      leadFollowupMap.set(followup.leadId, scheduledDate);
    }
  });
  
  // Count calls today that are NOT first calls and had an overdue follow-up
  return calls.filter(call => {
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
    return leads.filter(lead => isToday(lead.createdAt, timezone)).length;
  }
  
  // Date range specified
  return leads.filter(lead => {
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
 * - New Calls: attemptNumber = 1 on selected date
 * - Follow-up Calls: attemptNumber > 1 on selected date
 * - Overdue Calls Handled: Calls made on selected date where previous_followup_date < selected_date
 * - Total Calls: All calls made on selected date
 * 
 * LEADS OUTCOME PAGE (Lead filtered by updatedAt = selected_date):
 * - Unqualified: status = 'unqualified' updated on selected date
 * - Unreachable: status = 'unreachable' updated on selected date
 * - Won: status = 'won' updated on selected date
 * - Lost: status = 'lost' updated on selected date
 */
export function calculateDSRMetrics(input: DSRMetricsInput): DSRMetricsResult {
  const timezone = input.timezone || DEFAULT_TIMEZONE;
  const dateRange = input.dateRange;
  
  // Filter data by agent if specified
  let leads = input.leads;
  let followups = input.followups;
  let calls = input.calls;
  
  if (input.agentId) {
    leads = leads.filter(lead => lead.assignedToId === input.agentId);
    const leadIds = new Set(leads.map(l => l.id));
    followups = followups.filter(f => leadIds.has(f.leadId));
    calls = calls.filter(c => leadIds.has(c.leadId));
  }
  
  // CALLS PAGE METRICS - Based on calls made today + Lead's callAttempts field
  // Filter calls made on selected date
  const callsOnDate = calls.filter(call => {
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
  
  // Get unique lead IDs that had calls today
  const leadsWithCallsToday = new Set(callsOnDate.map(c => c.leadId));
  
  // New Calls: Leads that had calls today AND have callAttempts = 1
  const newCallsCount = leads.filter(lead => 
    leadsWithCallsToday.has(lead.id) && (lead.callAttempts || 0) === 1
  ).length;
  
  // Follow-up Calls: Leads that had calls today AND have callAttempts > 1 (not 1)
  const followupCallsCount = leads.filter(lead => 
    leadsWithCallsToday.has(lead.id) && (lead.callAttempts || 0) > 1
  ).length;
  
  // Overdue Calls Handled: Leads with calls today AND had follow-up scheduled BEFORE today (overdue)
  const overdueCallsHandled = leads.filter(lead => {
    // Must have had a call today
    if (!leadsWithCallsToday.has(lead.id)) return false;
    
    // Determine the reference date (selected date or today)
    let referenceDate: Date;
    if (dateRange?.endDate) {
      referenceDate = typeof dateRange.endDate === 'string' ? new Date(dateRange.endDate) : dateRange.endDate;
      referenceDate.setHours(23, 59, 59, 999); // End of selected date
    } else {
      referenceDate = new Date();
      // Use current time for today
    }
    
    // Check if this lead had any follow-up scheduled BEFORE now (overdue)
    const leadFollowups = followups.filter(f => f.leadId === lead.id);
    
    return leadFollowups.some(f => {
      const scheduledDate = typeof f.scheduledAt === 'string' ? new Date(f.scheduledAt) : f.scheduledAt;
      return scheduledDate < referenceDate; // Scheduled before now = overdue
    });
  }).length;
  
  // Total Calls: All calls on selected date
  const totalCalls = callsOnDate.length;
  
  // LEADS OUTCOME PAGE METRICS - All filtered by lead updatedAt on selected date
  // Unqualified: Leads with status='unqualified' updated on selected date
  const totalUnqualified = getStatusChangeToday(leads, 'unqualified', timezone, dateRange);
  
  // Unreachable: Leads with status='unreach' updated on selected date
  const totalUnreachable = getStatusChangeToday(leads, 'unreach', timezone, dateRange);
  
  // Won: Leads with status='won' updated on selected date
  const totalWon = getStatusChangeToday(leads, 'won', timezone, dateRange);
  
  // Lost: Leads with status='lost' updated on selected date
  const totalLost = getStatusChangeToday(leads, 'lost', timezone, dateRange);
  
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
