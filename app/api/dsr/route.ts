import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createApiError } from '@/lib/api-middleware';
import { hasPermission } from '@/lib/roles';
import prisma from '@/lib/prisma';
import { Session } from 'next-auth';
import { startOfDay, endOfDay, format } from 'date-fns';

export async function GET(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;
      const searchParams = request.nextUrl.searchParams;
      
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const userId = searchParams.get('userId');
      const exportType = searchParams.get('exportType') || 'individual';

      if (!startDate || !endDate) {
        return createApiError('Start date and end date are required', 400);
      }

      const start = startOfDay(new Date(startDate));
      const end = endOfDay(new Date(endDate));

      // Check permissions
      if (exportType === 'team' && !hasPermission(sess, 'dsr', 'export')) {
        return createApiError('You do not have permission to view team DSR', 403);
      }

      // Determine which users to include
      let targetUserIds: string[] = [];
      if (exportType === 'individual') {
        targetUserIds = [userId || sess.user.id];
      } else {
        // Get all agents
        const agents = await prisma.user.findMany({
          where: {
            isActive: true,
            role: {
              name: {
                in: ['Agent', 'SuperAgent'],
              },
            },
          },
          select: { id: true },
        });
        targetUserIds = agents.map((a) => a.id);
      }

      // Fetch DSR data for each user
      const dsrData = await Promise.all(
        targetUserIds.map(async (targetUserId) => {
          const user = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: {
              id: true,
              name: true,
              email: true,
            },
          });

          if (!user) return null;

          const [callLogs, leadsContacted, leadsQualified, leadsConverted, followUps] =
            await Promise.all([
              // Total calls
              prisma.callLog.count({
                where: {
                  callerId: targetUserId,
                  startedAt: {
                    gte: start,
                    lte: end,
                  },
                },
              }),

              // Leads contacted
              prisma.lead.count({
                where: {
                  assignedToId: targetUserId,
                  status: {
                    in: ['contacted', 'qualified', 'converted'],
                  },
                  updatedAt: {
                    gte: start,
                    lte: end,
                  },
                },
              }),

              // Leads qualified
              prisma.lead.count({
                where: {
                  assignedToId: targetUserId,
                  status: 'qualified',
                  updatedAt: {
                    gte: start,
                    lte: end,
                  },
                },
              }),

              // Leads converted
              prisma.lead.count({
                where: {
                  assignedToId: targetUserId,
                  status: 'converted',
                  updatedAt: {
                    gte: start,
                    lte: end,
                  },
                },
              }),

              // Follow-ups
              prisma.followUp.findMany({
                where: {
                  createdById: targetUserId,
                  createdAt: {
                    gte: start,
                    lte: end,
                  },
                },
                select: {
                  status: true,
                },
              }),
            ]);

          const followUpsScheduled = followUps.length;
          const followUpsCompleted = followUps.filter((f) => f.status === 'completed').length;

          // Get detailed call stats
          const callStats = await prisma.callLog.groupBy({
            by: ['callStatus'],
            where: {
              callerId: targetUserId,
              startedAt: {
                gte: start,
                lte: end,
              },
            },
            _count: {
              callStatus: true,
            },
          });

          return {
            userId: user.id,
            userName: user.name || user.email,
            userEmail: user.email,
            period: {
              startDate: format(start, 'yyyy-MM-dd'),
              endDate: format(end, 'yyyy-MM-dd'),
            },
            metrics: {
              totalCalls: callLogs,
              callsAnswered: callStats.find((s) => s.callStatus === 'answered')?._count.callStatus || 0,
              callsNotAnswered:
                callStats.find((s) => s.callStatus === 'not_answered')?._count.callStatus || 0,
              callsBusy: callStats.find((s) => s.callStatus === 'busy')?._count.callStatus || 0,
              leadsContacted,
              leadsQualified,
              leadsConverted,
              followUpsScheduled,
              followUpsCompleted,
            },
          };
        })
      );

      const validDsrData = dsrData.filter((d) => d !== null);

      // Save export record
      await prisma.dSRExport.create({
        data: {
          userId: sess.user.id,
          startDate: start,
          endDate: end,
          exportType,
          metadata: {
            recordCount: validDsrData.length,
          },
        },
      });

      return createApiResponse(validDsrData);
    } catch (error) {
      console.error('DSR API error:', error);
      return createApiError('Failed to generate DSR', 500);
    }
  });
}

// Export DSR to CSV
export async function POST(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;

      if (!hasPermission(sess, 'dsr', 'export')) {
        return createApiError('You do not have permission to export DSR', 403);
      }

      const body = await request.json();
      const { startDate, endDate, exportType = 'individual', userId } = body;

      if (!startDate || !endDate) {
        return createApiError('Start date and end date are required', 400);
      }

      // Build CSV URL (in production, this would generate and upload to S3)
      const csvUrl = `/api/dsr/export?startDate=${startDate}&endDate=${endDate}&exportType=${exportType}${userId ? `&userId=${userId}` : ''}`;

      return createApiResponse(
        {
          csvUrl,
          expiresAt: new Date(Date.now() + 3600000), // 1 hour
        },
        'DSR export prepared successfully'
      );
    } catch (error) {
      console.error('DSR export error:', error);
      return createApiError('Failed to export DSR', 500);
    }
  });
}
