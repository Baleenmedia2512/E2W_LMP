import { Lead, FollowUp } from '@/lib/mock-data';

export interface CategorizedLead {
  lead: Lead;
  followUp?: FollowUp;
  category: 'overdue' | 'new' | 'future';
  sortValue: number;
}

export interface LeadCategories {
  overdue: CategorizedLead[];
  new: CategorizedLead[];
  future: CategorizedLead[];
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
  const categorized: CategorizedLead[] = [];

  leads.forEach((lead) => {
    // Find the next pending follow-up for this lead
    const leadFollowUps = followUps.filter(
      (f) => f.leadId === lead.id && f.status === 'pending'
    );

    if (leadFollowUps.length === 0) {
      // No follow-up history = New lead
      categorized.push({
        lead,
        category: 'new',
        sortValue: lead.createdAt.getTime(),
      });
    } else {
      // Has follow-up(s) - check if overdue or future
      const nextFollowUp = leadFollowUps.reduce((earliest, current) => {
        const earliestDate = earliest.dueDate || earliest.scheduledFor;
        const currentDate = current.dueDate || current.scheduledFor;
        return currentDate < earliestDate ? current : earliest;
      });

      const dueDate = nextFollowUp.dueDate || nextFollowUp.scheduledFor;

      if (dueDate < now) {
        // Overdue - sort by how overdue (largest time difference first)
        const timeDifference = now.getTime() - dueDate.getTime();
        categorized.push({
          lead,
          followUp: nextFollowUp,
          category: 'overdue',
          sortValue: -timeDifference, // Negative for descending order
        });
      } else {
        // Future - sort by scheduled time (ascending)
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
    .sort((a, b) => a.sortValue - b.sortValue); // Most overdue first (negative values)

  const newLeads = categorized
    .filter((item) => item.category === 'new')
    .sort((a, b) => a.sortValue - b.sortValue); // Oldest first

  const future = categorized
    .filter((item) => item.category === 'future')
    .sort((a, b) => a.sortValue - b.sortValue); // Earliest due date first

  return { overdue, new: newLeads, future };
}

/**
 * Formats the time difference for display
 * @param date - The date to compare
 * @returns Human-readable time difference
 */
export function formatTimeDifference(date: Date): string {
  const now = new Date();
  const diff = Math.abs(now.getTime() - date.getTime());
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
  const dueDate = followUp.dueDate || followUp.scheduledFor;
  return dueDate < now && followUp.status === 'pending';
}
