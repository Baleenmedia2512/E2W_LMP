import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createApiError } from '@/lib/api-middleware';
import prisma from '@/lib/prisma';
import { Session } from 'next-auth';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;
      const searchParams = request.nextUrl.searchParams;
      
      const from = searchParams.get('from');
      const to = searchParams.get('to');

      if (!from || !to) {
        return createApiError('from and to date parameters are required', 400);
      }

      const startDate = startOfDay(new Date(from));
      const endDate = endOfDay(new Date(to));
      const userId = sess.user.id;

      // Get all calls grouped by lead
      const callsByLead = await prisma.callLog.groupBy({
        by: ['leadId'],
        where: {
          callerId: userId,
          startedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          leadId: true,
        },
        orderBy: {
          _count: {
            leadId: 'desc',
          },
        },
        take: 1,
      });

      if (callsByLead.length === 0) {
        return createApiResponse({
          lead: null,
          attemptCount: 0,
          lastCallStatus: null,
        });
      }

      const topLeadId = callsByLead[0].leadId;
      const attemptCount = callsByLead[0]._count.leadId;

      // Get lead details
      const lead = await prisma.lead.findUnique({
        where: { id: topLeadId },
        select: {
          id: true,
          name: true,
          phone: true,
          status: true,
        },
      });

      // Get last call status
      const lastCall = await prisma.callLog.findFirst({
        where: {
          leadId: topLeadId,
          callerId: userId,
          startedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          startedAt: 'desc',
        },
        select: {
          callStatus: true,
          startedAt: true,
        },
      });

      return createApiResponse({
        lead: lead || null,
        attemptCount,
        lastCallStatus: lastCall?.callStatus || null,
        lastCallTime: lastCall?.startedAt || null,
      });
    } catch (error) {
      console.error('Most Contacted Lead API error:', error);
      return createApiError('Failed to fetch most contacted lead', 500);
    }
  });
}
