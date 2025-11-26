import { Lead, CallLog, FollowUp } from '@/lib/mock-data';

export interface DSRFilters {
  startDate: string;
  endDate: string;
  selectedAgent: string;
}

export interface DSRStats {
  newLeadsHandledToday: number;
  totalNewLeads: number;
  followUpsHandledToday: number;
  callsHandledToday: number;
  completedCallsToday: number;
  totalFollowUps: number;
}

/**
 * Calculate DSR statistics based on filters
 */
export function calculateDSRStats(
  leads: Lead[],
  callLogs: CallLog[],
  followUps: FollowUp[],
  filters: DSRFilters
): DSRStats {
  const start = new Date(filters.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(filters.endDate);
  end.setHours(23, 59, 59, 999);

  // Filter leads by agent
  const agentLeads = filters.selectedAgent === 'all' 
    ? leads 
    : leads.filter(lead => lead.assignedTo?.name === filters.selectedAgent);

  // 1. New Leads Handled Today (within date range)
  const newLeadsHandledToday = agentLeads.filter(lead => {
    const leadDate = new Date(lead.createdAt);
    return leadDate >= start && leadDate <= end;
  }).length;

  // 2. Total New Leads (all time for selected agent)
  const totalNewLeads = agentLeads.length;

  // 3. Follow-ups Handled Today (within date range)
  const followUpsHandledToday = followUps.filter(followUp => {
    const followUpDate = new Date(followUp.scheduledFor);
    const isInDateRange = followUpDate >= start && followUpDate <= end;
    
    const lead = agentLeads.find(l => l.id === followUp.leadId);
    return isInDateRange && lead && followUp.status === 'pending';
  }).length;

  // 4. Total Calls Handled Today (within date range)
  const callsHandledToday = callLogs.filter(call => {
    const callDate = new Date(call.createdAt);
    const isInDateRange = callDate >= start && callDate <= end;
    
    const lead = agentLeads.find(l => l.id === call.leadId);
    return isInDateRange && lead;
  }).length;

  // 5. Completed Calls Today
  const completedCallsToday = callLogs.filter(call => {
    const callDate = new Date(call.createdAt);
    const isInDateRange = callDate >= start && callDate <= end;
    const lead = agentLeads.find(l => l.id === call.leadId);
    return isInDateRange && lead && call.status === 'completed';
  }).length;

  // 6. Total Follow-ups (all time)
  const totalFollowUps = followUps.filter(followUp => {
    const lead = agentLeads.find(l => l.id === followUp.leadId);
    return lead !== undefined;
  }).length;

  return {
    newLeadsHandledToday,
    totalNewLeads,
    followUpsHandledToday,
    callsHandledToday,
    completedCallsToday,
    totalFollowUps,
  };
}

/**
 * Filter leads based on date range and agent selection
 */
export function filterLeadsForDSR(
  leads: Lead[],
  followUps: FollowUp[],
  filters: DSRFilters
): Lead[] {
  const start = new Date(filters.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(filters.endDate);
  end.setHours(23, 59, 59, 999);

  let filtered = filters.selectedAgent === 'all' 
    ? [...leads] 
    : leads.filter(lead => lead.assignedTo?.name === filters.selectedAgent);

  // Filter by date range (either created date or has follow-up in range)
  filtered = filtered.filter(lead => {
    const leadDate = new Date(lead.createdAt);
    const isLeadInRange = leadDate >= start && leadDate <= end;

    // Check if lead has follow-up in date range
    const hasFollowUpInRange = followUps.some(followUp => {
      const followUpDate = new Date(followUp.scheduledFor);
      return followUp.leadId === lead.id && 
             followUpDate >= start && 
             followUpDate <= end;
    });

    return isLeadInRange || hasFollowUpInRange;
  });

  return filtered;
}

/**
 * Get date range as readable string
 */
export function getDateRangeString(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  };
  
  const startStr = start.toLocaleDateString('en-US', options);
  const endStr = end.toLocaleDateString('en-US', options);
  
  if (startStr === endStr) {
    return startStr;
  }
  
  return `${startStr} - ${endStr}`;
}

/**
 * Check if dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

/**
 * Get performance rating based on stats
 */
export function getPerformanceRating(stats: DSRStats): {
  rating: 'excellent' | 'good' | 'average' | 'poor';
  color: string;
  message: string;
} {
  const callRate = stats.callsHandledToday;
  const conversionRate = stats.totalNewLeads > 0 
    ? (stats.newLeadsHandledToday / stats.totalNewLeads) * 100 
    : 0;

  if (callRate >= 15 && conversionRate >= 20) {
    return {
      rating: 'excellent',
      color: 'green',
      message: 'Outstanding performance!'
    };
  } else if (callRate >= 10 && conversionRate >= 15) {
    return {
      rating: 'good',
      color: 'blue',
      message: 'Great work!'
    };
  } else if (callRate >= 5 && conversionRate >= 10) {
    return {
      rating: 'average',
      color: 'orange',
      message: 'Keep pushing!'
    };
  } else {
    return {
      rating: 'poor',
      color: 'red',
      message: 'Needs improvement'
    };
  }
}
