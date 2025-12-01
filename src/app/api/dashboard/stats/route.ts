import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';

export const dynamic = 'force-dynamic';

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

    // Build base where clause for leads
    const leadsWhere: any = {};
    if (Object.keys(dateFilter).length > 0) {
      leadsWhere.createdAt = dateFilter;
    }
    if (userId) {
      leadsWhere.assignedToId = userId;
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

    // Fetch all stats in parallel for optimal performance
    const [
      totalLeads,
      newLeads,
      qualifiedLeads,
      wonLeads,
      lostLeads,
      pendingFollowUps,
      overdueFollowUps,
      recentLeads,
      upcomingFollowUps,
    ] = await Promise.all([
      // Total leads in date range
      prisma.lead.count({ where: leadsWhere }),

      // New leads
      prisma.lead.count({
        where: { ...leadsWhere, status: 'new' },
      }),

      // Qualified leads
      prisma.lead.count({
        where: { ...leadsWhere, status: 'qualified' },
      }),

      // Won deals
      prisma.lead.count({
        where: { ...leadsWhere, status: 'won' },
      }),

      // Lost deals
      prisma.lead.count({
        where: { ...leadsWhere, status: 'lost' },
      }),

      // Pending follow-ups in date range
      prisma.followUp.count({ where: followUpsWhere }),

      // Overdue follow-ups
      prisma.followUp.count({
        where: {
          status: 'pending',
          scheduledAt: { lt: now },
          ...(userId && {
            lead: {
              assignedToId: userId,
            },
          }),
        },
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

      // Upcoming follow-ups (top 5)
      prisma.followUp.findMany({
        where: followUpsWhere,
        include: {
          lead: { select: { id: true, name: true, phone: true, status: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
      }),
    ]);

    // Calculate high priority overdue count
    const highPriorityOverdue = await prisma.followUp.count({
      where: {
        status: 'pending',
        scheduledAt: { lt: now },
        priority: 'high',
        ...(userId && {
          lead: {
            assignedToId: userId,
          },
        }),
      },
    });

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
          highPriorityOverdue,
          conversionRate,
          winRate,
        },
        recentLeads,
        upcomingFollowUps,
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
