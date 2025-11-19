import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createApiError } from '@/lib/api-middleware';
import { createCallLogSchema } from '@/lib/validations';
import prisma from '@/lib/prisma';
import { Session } from 'next-auth';

export async function POST(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;
      const body = await request.json();
      const validation = createCallLogSchema.safeParse(body);

      if (!validation.success) {
        return createApiError(
          'Validation failed: ' + validation.error.errors.map((e) => e.message).join(', '),
          400
        );
      }

      const { leadId, startedAt, endedAt, remarks, callStatus, metadata } = validation.data;

      // Verify lead exists
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          callLogs: {
            orderBy: { attemptNumber: 'desc' },
            take: 1,
          },
        },
      });

      if (!lead) {
        return createApiError('Lead not found', 404);
      }

      // Calculate duration if both start and end provided
      let duration: number | null = null;
      if (endedAt) {
        const start = new Date(startedAt);
        const end = new Date(endedAt);
        duration = Math.floor((end.getTime() - start.getTime()) / 1000); // seconds
      }

      // Get next attempt number
      const attemptNumber = (lead.callLogs[0]?.attemptNumber || 0) + 1;

      // Create call log
      const callLog = await prisma.callLog.create({
        data: {
          leadId,
          callerId: sess.user.id,
          startedAt: new Date(startedAt),
          endedAt: endedAt ? new Date(endedAt) : null,
          duration,
          remarks,
          callStatus,
          attemptNumber,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        },
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          caller: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Update lead status if it was new
      if (lead.status === 'new') {
        await prisma.lead.update({
          where: { id: leadId },
          data: { status: 'contacted' },
        });
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'call',
          userId: sess.user.id,
          targetType: 'Lead',
          targetId: leadId,
          changes: {
            callLog: {
              attemptNumber,
              callStatus,
              duration,
            },
          },
        },
      });

      return createApiResponse(callLog, 'Call log created successfully');
    } catch (error) {
      console.error('Create call log error:', error);
      return createApiError('Failed to create call log', 500);
    }
  });
}

export async function GET(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;
      const searchParams = request.nextUrl.searchParams;
      const leadId = searchParams.get('leadId');

      const where: Record<string, unknown> = {};

      if (leadId) {
        where.leadId = leadId;
      }

      // Agents can only see their own call logs
      if (sess.user.role === 'Agent') {
        where.callerId = sess.user.id;
      }

      const callLogs = await prisma.callLog.findMany({
        where,
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
              status: true,
            },
          },
          caller: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          startedAt: 'desc',
        },
        take: 50,
      });

      return createApiResponse(callLogs);
    } catch (error) {
      console.error('Get call logs error:', error);
      return createApiError('Failed to fetch call logs', 500);
    }
  });
}
