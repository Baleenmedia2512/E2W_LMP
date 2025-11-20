import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createApiError } from '@/lib/api-middleware';
import prisma from '@/lib/prisma';
import { Session } from 'next-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;
      const leadId = params.leadId;

      if (!leadId) {
        return createApiError('Lead ID is required', 400);
      }

      // Get all call attempts for this lead by the current user
      const attempts = await prisma.callLog.findMany({
        where: {
          leadId: leadId,
          callerId: sess.user.id,
        },
        orderBy: {
          startedAt: 'desc',
        },
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
          duration: true,
          callStatus: true,
          remarks: true,
          attemptNumber: true,
        },
      });

      // Get lead details
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: {
          id: true,
          name: true,
          phone: true,
          status: true,
        },
      });

      return createApiResponse({
        lead,
        attempts,
        totalAttempts: attempts.length,
      });
    } catch (error) {
      console.error('Lead Attempts API error:', error);
      return createApiError('Failed to fetch lead attempts', 500);
    }
  });
}
