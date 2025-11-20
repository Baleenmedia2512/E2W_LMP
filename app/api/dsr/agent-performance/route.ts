import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createApiError } from '@/lib/api-middleware';
import { hasPermission } from '@/lib/roles';
import prisma from '@/lib/prisma';
import { Session } from 'next-auth';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;

      // Check if user has permission to view all agent performance
      if (!hasPermission(sess, 'dsr', 'export')) {
        return createApiError('You do not have permission to view team performance', 403);
      }

      const searchParams = request.nextUrl.searchParams;
      const from = searchParams.get('from');
      const to = searchParams.get('to');

      if (!from || !to) {
        return createApiError('from and to date parameters are required', 400);
      }

      const startDate = startOfDay(new Date(from));
      const endDate = endOfDay(new Date(to));

      // Get all active agents
      const agents = await prisma.user.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      // Get performance for each agent
      const agentPerformance = await Promise.all(
        agents.map(async (agent) => {
          const calls = await prisma.callLog.findMany({
            where: {
              callerId: agent.id,
              startedAt: {
                gte: startDate,
                lte: endDate,
              },
            },
            select: {
              callStatus: true,
              duration: true,
            },
          });

          const followUps = await prisma.followUp.count({
            where: {
              createdById: agent.id,
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
          });

          const totalCalls = calls.length;
          const answeredCalls = calls.filter(c => c.callStatus === 'answered').length;
          const notAnsweredCalls = calls.filter(c => c.callStatus === 'not_answered').length;
          const totalTalkTime = calls
            .filter(c => c.duration)
            .reduce((sum, c) => sum + (c.duration || 0), 0);
          const avgDuration = totalCalls > 0 ? Math.round(totalTalkTime / totalCalls) : 0;

          return {
            agentId: agent.id,
            agentName: agent.name || agent.email,
            agentEmail: agent.email,
            totalCalls,
            answeredCalls,
            notAnsweredCalls,
            followUps,
            totalTalkTime,
            avgDuration,
          };
        })
      );

      // Sort by total calls descending
      agentPerformance.sort((a, b) => b.totalCalls - a.totalCalls);

      return createApiResponse(agentPerformance);
    } catch (error) {
      console.error('Agent Performance API error:', error);
      return createApiError('Failed to fetch agent performance', 500);
    }
  });
}
