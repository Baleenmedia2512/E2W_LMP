import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createApiError } from '@/lib/api-middleware';
import prisma from '@/lib/prisma';
import { Session } from 'next-auth';

export async function GET(request: NextRequest, { params }: { params: { leadId: string } }) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;
      const { leadId } = params;

      // Verify lead exists
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: {
          id: true,
          name: true,
          phone: true,
          status: true,
        },
      });

      if (!lead) {
        return createApiError('Lead not found', 404);
      }

      const where: Record<string, unknown> = {
        leadId,
      };

      // Agents can only see their own call logs
      if (sess.user.role === 'Agent') {
        where.callerId = sess.user.id;
      }

      const callLogs = await prisma.callLog.findMany({
        where,
        include: {
          caller: {
            select: {
              id: true,
              name: true,
              email: true,
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          attemptNumber: 'asc',
        },
      });

      return createApiResponse({
        lead,
        attempts: callLogs,
        totalAttempts: callLogs.length,
      });
    } catch (error) {
      console.error('Get lead call attempts error:', error);
      return createApiError('Failed to fetch call attempts', 500);
    }
  });
}
