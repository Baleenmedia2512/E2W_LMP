/**
 * DSR (Daily Sales Report) Metrics Calculation Service
 * Production-ready service for calculating all DSR metrics with proper timezone handling
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
  }>;
  agentId?: string | null;
  timezone?: string;
  dateRange?: {
    startDate?: Date | string;
    endDate?: Date | string;
  };
}

export interface DSRMetricsResult {
  newLeads: { today: number; total: number };
  followups: { today: number; total: number };
  calls: { today: number };
  overdueFollowups: { total: number };
  unqualified: { today: number; total: number };
  unreachable: { today: number; total: number };
  won: { today: number; total: number };
  lost: { today: number; total: number };
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
 * Get count of followups scheduled or created today or in date range
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
      const createdToday = isToday(followup.createdAt, timezone);
      return scheduledToday || createdToday;
    }).length;
  }
  
  // Date range specified
  return followups.filter(followup => {
    const scheduledDate = typeof followup.scheduledAt === 'string' ? new Date(followup.scheduledAt) : followup.scheduledAt;
    const createdDate = typeof followup.createdAt === 'string' ? new Date(followup.createdAt) : followup.createdAt;
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
    
    return checkInRange(scheduledDate) || checkInRange(createdDate);
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
 * Get count of overdue followups (scheduled < now)
 */
function getOverdueFollowups(
  followups: DSRMetricsInput['followups'],
  timezone: string = DEFAULT_TIMEZONE
): number {
  const now = new Date();
  return followups.filter(followup => {
    const scheduledDate = typeof followup.scheduledAt === 'string' 
      ? new Date(followup.scheduledAt) 
      : followup.scheduledAt;
    return scheduledDate < now;
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
 * Calculate all DSR metrics based on the requirements
 * 
 * Metrics calculated:
 * 1. New Leads Handled: today count / total count
 * 2. Follow-ups Handled: today count / total count
 * 3. Total Calls: today count only
 * 4. Overdue Follow-ups: total count only
 * 5. Unqualified Today: today count / total count
 * 6. Unreachable Today: today count / total count
 * 7. Won Deals Today: today count / total count
 * 8. Lost Deals Today: today count / total count
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
  
  // 1. New Leads Handled
  const newLeadsToday = getNewLeadsToday(leads, timezone, dateRange);
  const totalNewLeads = getTotalByStatus(leads, 'new');
  
  // 2. Follow-ups Handled
  const followupsToday = getFollowupsToday(followups, timezone, dateRange);
  const totalPendingFollowups = getPendingFollowups(followups, timezone);
  
  // 3. Total Calls (today or in range)
  const callsToday = getCallsToday(calls, timezone, dateRange);
  
  // 4. Overdue Follow-ups (total only)
  const totalOverdueFollowups = getOverdueFollowups(followups, timezone);
  
  // 5. Unqualified Today (or in range)
  const unqualifiedToday = getStatusChangeToday(leads, 'unqualified', timezone, dateRange);
  const totalUnqualified = getTotalByStatus(leads, 'unqualified');
  
  // 6. Unreachable Today (or in range)
  const unreachableToday = getStatusChangeToday(leads, 'unreach', timezone, dateRange);
  const totalUnreachable = getTotalByStatus(leads, 'unreach');
  
  // 7. Won Deals Today (or in range)
  const wonToday = getStatusChangeToday(leads, 'won', timezone, dateRange);
  const totalWon = getTotalByStatus(leads, 'won');
  
  // 8. Lost Deals Today (or in range)
  const lostToday = getStatusChangeToday(leads, 'lost', timezone, dateRange);
  const totalLost = getTotalByStatus(leads, 'lost');
  
  return {
    newLeads: { 
      today: newLeadsToday, 
      total: totalNewLeads 
    },
    followups: { 
      today: followupsToday, 
      total: totalPendingFollowups 
    },
    calls: { 
      today: callsToday 
    },
    overdueFollowups: { 
      total: totalOverdueFollowups 
    },
    unqualified: { 
      today: unqualifiedToday, 
      total: totalUnqualified 
    },
    unreachable: { 
      today: unreachableToday, 
      total: totalUnreachable 
    },
    won: { 
      today: wonToday, 
      total: totalWon 
    },
    lost: { 
      today: lostToday, 
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
};
