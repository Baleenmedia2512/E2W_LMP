import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createApiError } from '@/lib/api-middleware';
import { createFollowUpSchema, updateFollowUpSchema } from '@/lib/validations';
import prisma from '@/lib/prisma';
import { Session } from 'next-auth';

export async function POST(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;
      const body = await request.json();
      const validation = createFollowUpSchema.safeParse(body);

      if (!validation.success) {
        return createApiError(
          'Validation failed: ' + validation.error.errors.map((e) => e.message).join(', '),
          400
        );
      }

      const { leadId, scheduledAt, notes, priority } = validation.data;

      // Verify lead exists
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
      });

      if (!lead) {
        return createApiError('Lead not found', 404);
      }

      // Create follow-up
      const followUp = await prisma.followUp.create({
        data: {
          leadId,
          scheduledAt: new Date(scheduledAt),
          notes,
          priority,
          createdById: sess.user.id,
        },
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
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
      });

      // Create notification for assigned agent
      if (lead.assignedToId && lead.assignedToId !== sess.user.id) {
        await prisma.notification.create({
          data: {
            userId: lead.assignedToId,
            type: 'follow_up_due',
            title: 'New Follow-up Scheduled',
            message: `A follow-up has been scheduled for ${lead.name}`,
            metadata: { followUpId: followUp.id, leadId },
          },
        });
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'create_followup',
          userId: sess.user.id,
          targetType: 'FollowUp',
          targetId: followUp.id,
          changes: { after: followUp },
        },
      });

      return createApiResponse(followUp, 'Follow-up scheduled successfully');
    } catch (error) {
      console.error('Create follow-up error:', error);
      return createApiError('Failed to schedule follow-up', 500);
    }
  });
}

export async function GET(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;
      const searchParams = request.nextUrl.searchParams;
      const leadId = searchParams.get('leadId');
      const status = searchParams.get('status');

      const where: Record<string, unknown> = {};

      if (leadId) {
        where.leadId = leadId;
      }

      if (status) {
        where.status = status;
      }

      // Agents can only see follow-ups for their assigned leads
      if (sess.user.role === 'Agent') {
        where.lead = {
          assignedToId: sess.user.id,
        };
      }

      const followUps = await prisma.followUp.findMany({
        where,
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
              status: true,
              assignedTo: {
                select: {
                  id: true,
                  name: true,
                },
              },
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
        take: 100,
      });

      return createApiResponse(followUps);
    } catch (error) {
      console.error('Get follow-ups error:', error);
      return createApiError('Failed to fetch follow-ups', 500);
    }
  });
}
