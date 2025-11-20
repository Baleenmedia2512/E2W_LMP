import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createApiError } from '@/lib/api-middleware';
import prisma from '@/lib/prisma';
import { Session } from 'next-auth';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;
      const today = new Date();
      const startOfToday = startOfDay(today);
      const endOfToday = endOfDay(today);

      // Build where clause based on role
      const leadWhere: Record<string, unknown> =
        sess.user.role === 'Agent' ? { assignedToId: sess.user.id } : {};

      // Get dashboard statistics
      const [
        newLeadsToday,
        followUpsDue,
        callsToday,
        conversionsToday,
        totalLeads,
        assignedLeads,
        unassignedLeads,
        recentLeads,
        todayFollowUps,
      ] = await Promise.all([
        // New leads today - only count leads with status "new" created today
        prisma.lead.count({
          where: {
            ...leadWhere,
            status: 'new',
            createdAt: {
              gte: startOfToday,
              lte: endOfToday,
            },
          },
        }),

        // Follow-ups due today
        prisma.followUp.count({
          where: {
            status: 'pending',
            scheduledAt: {
              gte: startOfToday,
              lte: endOfToday,
            },
            lead: leadWhere.assignedToId ? { assignedToId: sess.user.id } : undefined,
          },
        }),

        // Calls today
        prisma.callLog.count({
          where: {
            startedAt: {
              gte: startOfToday,
              lte: endOfToday,
            },
            ...(sess.user.role === 'Agent' ? { callerId: sess.user.id } : {}),
          },
        }),

        // Conversions today
        prisma.lead.count({
          where: {
            ...leadWhere,
            status: 'converted',
            updatedAt: {
              gte: startOfToday,
              lte: endOfToday,
            },
          },
        }),

        // Total leads
        prisma.lead.count({
          where: leadWhere,
        }),

        // Assigned leads
        prisma.lead.count({
          where: {
            ...leadWhere,
            assignedToId: { not: null },
          },
        }),

        // Unassigned leads (SuperAgent only)
        sess.user.role === 'SuperAgent'
          ? prisma.lead.count({
              where: {
                assignedToId: null,
              },
            })
          : Promise.resolve(0),

        // Recent leads
        prisma.lead.findMany({
          where: leadWhere,
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        }),

        // Today's follow-ups
        prisma.followUp.findMany({
          where: {
            status: 'pending',
            scheduledAt: {
              gte: startOfToday,
              lte: endOfToday,
            },
            lead: leadWhere.assignedToId ? { assignedToId: sess.user.id } : undefined,
          },
          include: {
            lead: {
              select: {
                id: true,
                name: true,
                phone: true,
                status: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            scheduledAt: 'asc',
          },
          take: 20,
        }),
      ]);

      // Get status breakdown
      const statusBreakdown = await prisma.lead.groupBy({
        by: ['status'],
        where: leadWhere,
        _count: {
          status: true,
        },
      });

      // Get source breakdown
      const sourceBreakdown = await prisma.lead.groupBy({
        by: ['source'],
        where: leadWhere,
        _count: {
          source: true,
        },
        orderBy: {
          _count: {
            source: 'desc',
          },
        },
        take: 10,
      });

      return createApiResponse({
        stats: {
          newLeadsToday,
          followUpsDue,
          callsToday,
          conversionsToday,
          totalLeads,
          assignedLeads,
          unassignedLeads,
        },
        recentLeads,
        todayFollowUps,
        statusBreakdown,
        sourceBreakdown,
      });
    } catch (error) {
      console.error('Dashboard API error:', error);
      return createApiError('Failed to fetch dashboard data', 500);
    }
  });
}
