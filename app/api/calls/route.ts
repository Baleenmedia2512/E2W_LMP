import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createApiError } from '@/lib/api-middleware';
import { createCallLogSchema } from '@/lib/validations';
import prisma from '@/lib/prisma';
import { Session } from 'next-auth';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { createUndoLog } from '@/lib/undo-helper';

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

      // Create undo log for call creation
      await createUndoLog({
        userId: sess.user.id,
        action: 'add_call',
        targetType: 'CallLog',
        targetId: callLog.id,
        previousState: {
          leadId,
          leadStatus: lead.status,
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
      const groupByLead = searchParams.get('groupByLead') === 'true';
      const dateFilter = searchParams.get('dateFilter'); // 'today', 'week', 'month'

      const where: Record<string, unknown> = {};

      if (leadId) {
        where.leadId = leadId;
      }

      // Agents can only see their own call logs
      if (sess.user.role === 'Agent') {
        where.callerId = sess.user.id;
      }

      // Date filter - filter by call date
      if (dateFilter) {
        const today = new Date();
        const startOfToday = startOfDay(today);
        const endOfToday = endOfDay(today);

        switch (dateFilter) {
          case 'today':
            where.startedAt = {
              gte: startOfToday,
              lte: endOfToday,
            };
            break;
          case 'week':
            where.startedAt = {
              gte: subDays(startOfToday, 7),
              lte: endOfToday,
            };
            break;
          case 'month':
            where.startedAt = {
              gte: subDays(startOfToday, 30),
              lte: endOfToday,
            };
            break;
        }
      }

      if (groupByLead) {
        // Group by lead - get the most recent call for each lead
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
                role: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            startedAt: 'desc',
          },
        });

        // Group by leadId and keep only the most recent call per lead
        const groupedMap = new Map();
        const attemptCounts = new Map<string, number>();

        // First pass - count total attempts per lead
        for (const log of callLogs) {
          const count = attemptCounts.get(log.leadId) || 0;
          attemptCounts.set(log.leadId, count + 1);
        }

        // Second pass - get most recent call per lead
        for (const log of callLogs) {
          if (!groupedMap.has(log.leadId)) {
            groupedMap.set(log.leadId, {
              ...log,
              totalAttempts: attemptCounts.get(log.leadId) || 1,
            });
          }
        }

        const grouped = Array.from(groupedMap.values());
        return createApiResponse(grouped);
      } else {
        // Return all call logs ungrouped
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
      }
    } catch (error) {
      console.error('Get call logs error:', error);
      return createApiError('Failed to fetch call logs', 500);
    }
  });
}
