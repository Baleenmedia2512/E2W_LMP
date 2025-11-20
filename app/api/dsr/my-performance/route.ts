import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createApiError } from '@/lib/api-middleware';
import prisma from '@/lib/prisma';
import { Session } from 'next-auth';
import { startOfDay, endOfDay, subDays } from 'date-fns';

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

      // Get all calls made by user
      const calls = await prisma.callLog.findMany({
        where: {
          callerId: userId,
          startedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          callStatus: true,
          duration: true,
          leadId: true,
          startedAt: true,
        },
      });

      // Get follow-ups for the period
      const followUps = await prisma.followUp.findMany({
        where: {
          createdById: userId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          status: true,
        },
      });

      // Get leads handled (assigned or created)
      const leadsHandled = await prisma.lead.findMany({
        where: {
          OR: [
            { assignedToId: userId },
            { createdById: userId },
          ],
          updatedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          status: true,
        },
      });

      // Calculate metrics
      const totalCalls = calls.length;
      const answeredCalls = calls.filter(c => c.callStatus === 'answered').length;
      const notAnsweredCalls = calls.filter(c => c.callStatus === 'not_answered').length;
      const followUpCalls = calls.filter(c => {
        // A call is a follow-up call if the lead was contacted before
        return c.callStatus === 'answered';
      }).length;

      const newLeadsHandled = leadsHandled.filter(l => l.status === 'new').length;
      const unreachableCount = leadsHandled.filter(l => l.status === 'unreach').length;
      const unqualifiedCount = leadsHandled.filter(l => l.status === 'unqualified').length;

      // Calculate talk time
      const totalTalkTime = calls
        .filter(c => c.duration)
        .reduce((sum, c) => sum + (c.duration || 0), 0);
      
      const avgCallDuration = totalCalls > 0 ? Math.round(totalTalkTime / totalCalls) : 0;

      // Get unique leads contacted
      const uniqueLeadsContacted = new Set(calls.map(c => c.leadId)).size;

      const performance = {
        totalCalls,
        answeredCalls,
        notAnsweredCalls,
        followUpCalls,
        newLeadsHandled,
        unreachableCount,
        unqualifiedCount,
        totalTalkTime, // in seconds
        avgCallDuration, // in seconds
        uniqueLeadsContacted,
        followUpsScheduled: followUps.length,
        followUpsCompleted: followUps.filter(f => f.status === 'completed').length,
      };

      return createApiResponse(performance);
    } catch (error) {
      console.error('My Performance API error:', error);
      return createApiError('Failed to fetch performance data', 500);
    }
  });
}
