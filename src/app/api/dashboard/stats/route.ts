import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/dashboard/stats
 * Fetch comprehensive dashboard statistics with date range filtering
 * 
 * Query Parameters:
 * - startDate: ISO date string (required for filtering)
 * - endDate: ISO date string (required for filtering)
 * - userId: Filter by assigned user (optional)
 * 
 * When date range is provided (e.g., Today):
 * - New Arrival: Leads CREATED in date range
 * - Follow-up Today: Follow-ups SCHEDULED in date range
 * - Overdue Follow-up: Follow-ups that BECAME overdue in date range
 * - Total: All leads CREATED or UPDATED in date range
 * - Won: Leads marked as WON (updatedAt) in date range
 * - Conversations: Calls made in date range
 * - Win Rate: Won / (Won + Lost) in date range
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const userId = searchParams.get('userId');

    // Build date filter for the selected range
    const dateFilter: any = {};
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
      
      dateFilter.gte = startDate;
      dateFilter.lte = endDate;
    }

    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Build user filter
    const userFilter = userId ? { assignedToId: userId } : {};

    // 1. NEW ARRIVAL - Leads with status "new" created in date range
    const newLeadsWhere: any = { status: 'new', ...userFilter };
    if (hasDateFilter) {
      newLeadsWhere.createdAt = dateFilter;
    }

    // 2. FOLLOW-UPS SCHEDULED in date range - count unique leads
    // CRITICAL: Only count follow-ups for leads with ACTIVE statuses to match lead categorization
    // NOTE: For "Follow-ups Today" count, we need ALL follow-ups to find the NEXT one per lead
    const followUpsScheduledWhere: any = {
      lead: {
        status: {
          in: ['new', 'followup', 'qualified']
        },
        ...(userId && { assignedToId: userId }),
      },
    };
    // DON'T apply date filter here - we need all follow-ups to determine which is NEXT
    // The counting logic below will filter by today's date

    // 3. WON LEADS - marked as won (by updatedAt) in date range
    const wonLeadsWhere: any = { status: 'won', ...userFilter };
    if (hasDateFilter) {
      wonLeadsWhere.updatedAt = dateFilter;
    }

    // 4. LOST LEADS - marked as lost (by updatedAt) in date range
    const lostLeadsWhere: any = { status: 'lost', ...userFilter };
    if (hasDateFilter) {
      lostLeadsWhere.updatedAt = dateFilter;
    }

    // 5. TOTAL LEADS - updated (last edited) in date range
    const totalLeadsWhere: any = { ...userFilter };
    if (hasDateFilter) {
      totalLeadsWhere.updatedAt = dateFilter;
    }

    // 6. CALLS/CONVERSATIONS - made in date range
    const callsWhere: any = {};
    if (hasDateFilter) {
      callsWhere.createdAt = dateFilter;
    }
    if (userId) {
      callsWhere.callerId = userId;
    }

    const now = new Date();

    // Fetch all stats in parallel for optimal performance
    const [
      newLeadsCount,
      wonLeadsCount,
      lostLeadsCount,
      totalLeadsCount,
      conversationsCount,
      followUpsScheduled,
      allPendingFollowUps,
      recentLeads,
      upcomingFollowUps,
    ] = await Promise.all([
      // 1. New leads created in date range
      prisma.lead.count({ where: newLeadsWhere }),

      // 2. Won leads in date range
      prisma.lead.count({ where: wonLeadsWhere }),

      // 3. Lost leads in date range
      prisma.lead.count({ where: lostLeadsWhere }),

      // 4. Total leads (created or updated in date range)
      prisma.lead.count({ where: totalLeadsWhere }),

      // 5. Conversations/Calls in date range
      prisma.callLog.count({ where: callsWhere }),

      // 6. Follow-ups scheduled in date range - get all to count unique leads
      prisma.followUp.findMany({ 
        where: followUpsScheduledWhere,
        select: { leadId: true, scheduledAt: true }
      }),

      // 7. All pending follow-ups (for overdue calculation) - CRITICAL: only for ACTIVE leads
      // This matches the lead categorization logic which filters by active statuses
      prisma.followUp.findMany({
        where: {
          lead: {
            status: {
              in: ['new', 'followup', 'qualified']
            },
            ...(userId && { assignedToId: userId }),
          },
        },
        orderBy: { scheduledAt: 'desc' },
      }),

      // 8. Recent leads (from date range)
      prisma.lead.findMany({
        where: newLeadsWhere,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // 9. Upcoming follow-ups for display - CRITICAL: only for ACTIVE leads
      prisma.followUp.findMany({
        where: {
          lead: {
            status: {
              in: ['new', 'followup', 'qualified']
            },
            ...(userId && { assignedToId: userId }),
          },
        },
        include: {
          lead: { select: { id: true, name: true, phone: true, status: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      }),
    ]);

    // Calculate unique leads with NEXT follow-up scheduled for TODAY
    // CRITICAL: This MUST match the logic in lead-categorization.ts exactly
    // We find the EARLIEST follow-up per lead to determine the "next" follow-up
    const leadFollowUpMap = new Map<string, any>();
    
    // Define today's date range
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    // Group follow-ups by lead and find the earliest (next) one
    for (const followUp of followUpsScheduled) {
      const existing = leadFollowUpMap.get(followUp.leadId);
      if (!existing || new Date(followUp.scheduledAt) < new Date(existing.scheduledAt)) {
        leadFollowUpMap.set(followUp.leadId, followUp);
      }
    }
    
    // Count only leads whose NEXT follow-up is scheduled for TODAY (including past times today)
    let followUpsDueCount = 0;
    for (const followUp of leadFollowUpMap.values()) {
      const scheduledDate = new Date(followUp.scheduledAt);
      // Count all follow-ups scheduled for today, regardless of whether time has passed
      if (scheduledDate >= todayStart && scheduledDate <= todayEnd) {
        followUpsDueCount++;
      }
    }

    // Calculate OVERDUE LEADS (count unique leads with overdue follow-ups)
    // CRITICAL: Must match lead-categorization.ts logic - find EARLIEST follow-up per lead
    // Count ALL overdue follow-ups (scheduledAt < now), regardless of date filter
    let overdueCount = 0;
    
    // Step 1: Group by leadId and find the EARLIEST (next) follow-up for each lead
    const leadNextFollowUpMap = new Map<string, any>();
    for (const followUp of allPendingFollowUps) {
      const existing = leadNextFollowUpMap.get(followUp.leadId);
      const followUpDate = new Date(followUp.scheduledAt);
      
      if (!existing || followUpDate < new Date(existing.scheduledAt)) {
        leadNextFollowUpMap.set(followUp.leadId, followUp);
      }
    }
    
    // Step 2: Count ALL leads whose NEXT follow-up is currently overdue (< now)
    const overdueLeadsSet = new Set<string>();
    for (const followUp of leadNextFollowUpMap.values()) {
      const scheduledDate = new Date(followUp.scheduledAt);
      if (scheduledDate < now) {
        overdueLeadsSet.add(followUp.leadId);
      }
    }
    overdueCount = overdueLeadsSet.size;

    // Prepare upcoming follow-ups for display (next 5 upcoming + fill with overdue if needed)
    // Use upcomingFollowUps data which includes lead information
    const upcomingArray: any[] = [];
    const overdueArray: any[] = [];
    
    // Create a map to track which leads we've already added (show only next follow-up per lead)
    const processedLeads = new Set<string>();
    
    // Sort all follow-ups by scheduled date
    const sortedFollowUps = [...upcomingFollowUps].sort((a, b) => 
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
    
    // Filter to keep only the earliest follow-up per lead and categorize
    for (const followUp of sortedFollowUps) {
      if (processedLeads.has(followUp.leadId)) continue;
      
      const scheduledDate = new Date(followUp.scheduledAt);
      if (scheduledDate < now) {
        overdueArray.push(followUp);
      } else {
        upcomingArray.push(followUp);
      }
      processedLeads.add(followUp.leadId);
    }
    
    // Take first 5 upcoming, or fill remaining slots with overdue
    const displayFollowUps = [...upcomingArray.slice(0, 5), ...overdueArray.slice(0, Math.max(0, 5 - upcomingArray.length))];

    // Calculate win rate (won / (won + lost)) for date range
    const totalClosed = wonLeadsCount + lostLeadsCount;
    const winRate = totalClosed > 0 
      ? Math.round((wonLeadsCount / totalClosed) * 100) 
      : 0;

    // Calculate conversion rate (won / total) for date range
    const conversionRate = totalLeadsCount > 0 
      ? Math.round((wonLeadsCount / totalLeadsCount) * 100) 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          newLeads: newLeadsCount,
          followUpsDue: followUpsDueCount,
          overdue: overdueCount,
          totalLeads: totalLeadsCount,
          wonLeads: wonLeadsCount,
          lostLeads: lostLeadsCount,
          conversations: conversationsCount,
          conversionRate,
          winRate,
        },
        recentLeads,
        upcomingFollowUps: displayFollowUps,
        timestamp: new Date().toISOString(),
        dateRange: hasDateFilter ? {
          start: startDateParam,
          end: endDateParam,
        } : null,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
