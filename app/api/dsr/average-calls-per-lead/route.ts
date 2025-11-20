import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createApiError } from '@/lib/api-middleware';
import prisma from '@/lib/prisma';
import { Session } from 'next-auth';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

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

      // Get calls for the period
      const calls = await prisma.callLog.findMany({
        where: {
          callerId: userId,
          startedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          leadId: true,
        },
      });

      // Get unique leads
      const uniqueLeads = new Set(calls.map(c => c.leadId));
      const totalLeadsWorked = uniqueLeads.size;
      const totalCalls = calls.length;
      const avgCallsPerLead = totalLeadsWorked > 0 
        ? (totalCalls / totalLeadsWorked).toFixed(2) 
        : '0.00';

      // Get trend for last 7 days
      const trend = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = startOfDay(subDays(new Date(), i));
        const dayEnd = endOfDay(subDays(new Date(), i));

        const dayCalls = await prisma.callLog.findMany({
          where: {
            callerId: userId,
            startedAt: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
          select: {
            leadId: true,
          },
        });

        const dayUniqueLeads = new Set(dayCalls.map(c => c.leadId));
        const dayAvg = dayUniqueLeads.size > 0 
          ? (dayCalls.length / dayUniqueLeads.size).toFixed(2)
          : '0.00';

        trend.push({
          date: format(dayStart, 'MMM dd'),
          avgCallsPerLead: parseFloat(dayAvg),
          totalCalls: dayCalls.length,
          totalLeads: dayUniqueLeads.size,
        });
      }

      return createApiResponse({
        totalLeadsWorked,
        totalCalls,
        avgCallsPerLead: parseFloat(avgCallsPerLead),
        trend,
      });
    } catch (error) {
      console.error('Average Calls Per Lead API error:', error);
      return createApiError('Failed to fetch average calls per lead', 500);
    }
  });
}
