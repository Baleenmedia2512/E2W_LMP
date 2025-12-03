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

    // 1. NEW ARRIVAL - Leads created in date range
    const newLeadsWhere: any = { ...userFilter };
    if (hasDateFilter) {
      newLeadsWhere.createdAt = dateFilter;
    }

    // 2. FOLLOW-UPS SCHEDULED in date range
    const followUpsScheduledWhere: any = {};
    if (hasDateFilter) {
      followUpsScheduledWhere.scheduledAt = dateFilter;
    }
    if (userId) {
      followUpsScheduledWhere.lead = { assignedToId: userId };
    }

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

    // 5. TOTAL LEADS - created OR updated in date range
    const totalLeadsWhere: any = { ...userFilter };
    if (hasDateFilter) {
      totalLeadsWhere.OR = [
        { createdAt: dateFilter },
        { updatedAt: dateFilter },
      ];
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

      // 6. Follow-ups scheduled in date range
      prisma.followUp.count({ where: followUpsScheduledWhere }),

      // 7. All pending follow-ups (for overdue calculation)
      prisma.followUp.findMany({
        where: {
          ...(userId && {
            lead: { assignedToId: userId },
          }),
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

      // 9. Upcoming follow-ups for display
      prisma.followUp.findMany({
        where: {
          ...(userId && {
            lead: { assignedToId: userId },
          }),
        },
        include: {
          lead: { select: { id: true, name: true, phone: true, status: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      }),
    ]);

    // Calculate OVERDUE LEADS (count of unique leads that became overdue in the date range)
    let overdueCount = 0;
    
    // Filter to keep only latest follow-up per lead
    const latestFollowUpsMap = new Map<string, any>();
    for (const followUp of allPendingFollowUps) {
      if (!latestFollowUpsMap.has(followUp.leadId)) {
        latestFollowUpsMap.set(followUp.leadId, followUp);
      }
    }

    // Count unique leads that became overdue in the selected date range
    if (hasDateFilter) {
      for (const followUp of latestFollowUpsMap.values()) {
        const scheduledDate = new Date(followUp.scheduledAt);
        // If scheduled date is before now AND within the date range (became overdue in this period)
        if (scheduledDate < now && 
            scheduledDate >= dateFilter.gte && 
            scheduledDate <= dateFilter.lte) {
          overdueCount++;
        }
      }
    } else {
      // If no date filter, count all currently overdue leads
      for (const followUp of latestFollowUpsMap.values()) {
        const scheduledDate = new Date(followUp.scheduledAt);
        if (scheduledDate < now) {
          overdueCount++;
        }
      }
    }

    // Prepare upcoming follow-ups for display (next 5) - reusing the same map
    const upcomingArray: any[] = [];
    const overdueArray: any[] = [];
    
    for (const followUp of latestFollowUpsMap.values()) {
      const scheduledDate = new Date(followUp.scheduledAt);
      if (scheduledDate < now) {
        overdueArray.push(followUp);
      } else {
        upcomingArray.push(followUp);
      }
    }
    
    upcomingArray.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    overdueArray.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    
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
          followUpsDue: followUpsScheduled,
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
