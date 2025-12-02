import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/dashboard/stats
 * Fetch comprehensive dashboard statistics with optional date range filtering
 * 
 * Query Parameters:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - userId: Filter by assigned user (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const userId = searchParams.get('userId');

    // Build date filter
    const dateFilter: any = {};
    if (startDateParam) {
      const startDate = new Date(startDateParam);
      startDate.setHours(0, 0, 0, 0);
      dateFilter.gte = startDate;
    }
    if (endDateParam) {
      const endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.lte = endDate;
    }

    // Build base where clause for leads (date-filtered)
    const leadsWhere: any = {};
    if (Object.keys(dateFilter).length > 0) {
      leadsWhere.createdAt = dateFilter;
    }
    if (userId) {
      leadsWhere.assignedToId = userId;
    }

    // Build where clause for total leads count (NO date filter, all leads)
    const totalLeadsWhere: any = {};
    if (userId) {
      totalLeadsWhere.assignedToId = userId;
    }

    // Build where clause for follow-ups
    const followUpsWhere: any = { status: 'pending' };
    if (Object.keys(dateFilter).length > 0) {
      followUpsWhere.scheduledAt = dateFilter;
    }
    if (userId) {
      followUpsWhere.lead = {
        assignedToId: userId,
      };
    }

    const now = new Date();

    // Build today's date filter for won leads
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const wonLeadsWhere: any = { 
      status: 'won',
      updatedAt: {
        gte: today,
        lte: todayEnd,
      },
    };
    if (userId) {
      wonLeadsWhere.assignedToId = userId;
    }

    // Fetch all stats in parallel for optimal performance
    const [
      totalLeads,
      newLeads,
      qualifiedLeads,
      wonLeads,
      lostLeads,
      allFollowUps,
      recentLeads,
      upcomingFollowUps,
    ] = await Promise.all([
      // Total leads - ALL leads in the system (no date filter)
      prisma.lead.count({ 
        where: userId ? { assignedToId: userId } : {} 
      }),

      // New leads (within date range)
      prisma.lead.count({
        where: { ...leadsWhere, status: 'new' },
      }),

      // Qualified leads
      prisma.lead.count({
        where: { ...leadsWhere, status: 'qualified' },
      }),

      // Won deals TODAY only
      prisma.lead.count({
        where: wonLeadsWhere,
      }),

      // Lost deals
      prisma.lead.count({
        where: { ...leadsWhere, status: 'lost' },
      }),

      // All pending follow-ups (to be filtered for latest per lead)
      prisma.followUp.findMany({
        where: {
          status: 'pending',
          ...(userId && {
            lead: {
              assignedToId: userId,
            },
          }),
        },
        orderBy: { scheduledAt: 'desc' },
      }),

      // Recent leads (top 5)
      prisma.lead.findMany({
        where: leadsWhere,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // All pending follow-ups for smart sorting
      prisma.followUp.findMany({
        where: {
          status: 'pending',
          ...(userId && {
            lead: {
              assignedToId: userId,
            },
          }),
        },
        include: {
          lead: { select: { id: true, name: true, phone: true, status: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      }),
    ]);

    // Filter to keep only the latest follow-up per lead (matching follow-ups page logic)
    const latestFollowUpsMap = new Map<string, any>();
    for (const followUp of allFollowUps) {
      if (!latestFollowUpsMap.has(followUp.leadId)) {
        latestFollowUpsMap.set(followUp.leadId, followUp);
      }
    }

    // Separate into upcoming and overdue for smart display
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
    
    // Sort upcoming by scheduled date (next one first)
    upcomingArray.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    
    // Sort overdue by scheduled date (most overdue first)
    overdueArray.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    
    // Combine for display: upcoming first (next 5), then overdue if needed
    const displayFollowUps = [...upcomingArray.slice(0, 5), ...overdueArray.slice(0, Math.max(0, 5 - upcomingArray.length))];

    // Now count pending and overdue from the latest follow-ups only
    const pendingFollowUps = latestFollowUpsMap.size;
    const overdueFollowUps = overdueArray.length;

    // Calculate conversion rate
    const conversionRate = totalLeads > 0 
      ? Math.round((wonLeads / totalLeads) * 100) 
      : 0;

    // Calculate win rate (won / (won + lost))
    const totalClosed = wonLeads + lostLeads;
    const winRate = totalClosed > 0 
      ? Math.round((wonLeads / totalClosed) * 100) 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalLeads,
          newLeads,
          qualifiedLeads,
          wonLeads,
          lostLeads,
          followUpsDue: pendingFollowUps,
          overdue: overdueFollowUps,
          conversionRate,
          winRate,
        },
        recentLeads,
        upcomingFollowUps: displayFollowUps,
        timestamp: new Date().toISOString(),
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
