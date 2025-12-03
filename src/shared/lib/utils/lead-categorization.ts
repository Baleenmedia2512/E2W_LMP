import { Lead, FollowUp } from '@/shared/types';

export interface CategorizedLead {
  lead: Lead;
  followUp?: FollowUp;
  category: 'overdue' | 'new' | 'future';
  sortValue: number;
}

export interface LeadCategories {
  overdue: CategorizedLead[];
  newLeads: CategorizedLead[];
  future: CategorizedLead[];
}

/**
 * Converts a date string or Date object to a Date object
 * @param date - Date as string or Date object
 * @returns Date object
 */
function ensureDate(date: string | Date | undefined): Date {
  if (!date) return new Date();
  if (date instanceof Date) return date;
  return new Date(date);
}

/**
 * Categorizes and sorts leads based on follow-up status
 * @param leads - Array of leads to categorize
 * @param followUps - Array of follow-ups
 * @returns Categorized and sorted leads
 */
export function categorizeAndSortLeads(
  leads: Lead[],
  followUps: FollowUp[]
): LeadCategories {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const categorized: CategorizedLead[] = [];
  
  // Filter out leads with terminal statuses (unqualified, unreachable, won, lost)
  const activeStatuses = ['new', 'followup', 'qualified'];

  leads.forEach((lead) => {
    // Skip leads with terminal statuses
    if (!activeStatuses.includes(lead.status)) {
      return;
    }
    
    // Find the next follow-up for this lead
    const leadFollowUps = followUps.filter(
      (f) => f.leadId === lead.id
    );

    console.log(`Lead ${lead.name} (${lead.id}): Found ${leadFollowUps.length} follow-ups`);

    if (leadFollowUps.length === 0) {
      // No follow-up history = New lead
      const createdAtDate = ensureDate(lead.createdAt);
      categorized.push({
        lead,
        category: 'new',
        sortValue: createdAtDate.getTime(),
      });
    } else {
      // Has follow-up(s) - find the NEXT (earliest) pending follow-up
      // This ensures that if a lead has multiple follow-ups (e.g., 10:02, 10:03, 10:05)
      // and current time is 10:04, we show 10:05 as the next follow-up
      const nextFollowUp = leadFollowUps.reduce((earliest, current) => {
        const earliestDate = ensureDate(earliest.scheduledAt);
        const currentDate = ensureDate(current.scheduledAt);
        return currentDate < earliestDate ? current : earliest;
      });

      const dueDate = ensureDate(nextFollowUp.scheduledAt);

      if (dueDate < now) {
        // Overdue - past current time - sort by oldest first (most overdue first)
        categorized.push({
          lead,
          followUp: nextFollowUp,
          category: 'overdue',
          sortValue: dueDate.getTime(),
        });
      } else {
        // Scheduled (today or future) - sort by scheduled time (earliest first)
        categorized.push({
          lead,
          followUp: nextFollowUp,
          category: 'future',
          sortValue: dueDate.getTime(),
        });
      }
    }
  });

  // Separate and sort by category
  const overdue = categorized
    .filter((item) => item.category === 'overdue')
    .sort((a, b) => a.sortValue - b.sortValue); // Oldest first (most overdue first)

  const newLeads = categorized
    .filter((item) => item.category === 'new')
    .sort((a, b) => b.sortValue - a.sortValue); // Newest first

  const future = categorized
    .filter((item) => item.category === 'future')
    .sort((a, b) => a.sortValue - b.sortValue); // Earliest due date first

  return { overdue, newLeads, future };
}

/**
 * Formats the time difference for display
 * @param date - The date to compare
 * @returns Human-readable time difference
 */
export function formatTimeDifference(date: string | Date): string {
  const now = new Date();
  const dateObj = ensureDate(date);
  const diff = Math.abs(now.getTime() - dateObj.getTime());
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
}

/**
 * Checks if a follow-up is overdue
 * @param followUp - The follow-up to check
 * @returns True if overdue
 */
export function isFollowUpOverdue(followUp: FollowUp): boolean {
  const now = new Date();
  const dueDate = ensureDate(followUp.scheduledAt);
  return dueDate < now;
}





