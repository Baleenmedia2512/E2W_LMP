import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createApiError } from '@/lib/api-middleware';
import { updateFollowUpSchema } from '@/lib/validations';
import prisma from '@/lib/prisma';
import { Session } from 'next-auth';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;
      const { id } = params;

      const existingFollowUp = await prisma.followUp.findUnique({
        where: { id },
        include: {
          lead: true,
        },
      });

      if (!existingFollowUp) {
        return createApiError('Follow-up not found', 404);
      }

      const body = await request.json();
      const validation = updateFollowUpSchema.safeParse(body);

      if (!validation.success) {
        return createApiError(
          'Validation failed: ' + validation.error.errors.map((e) => e.message).join(', '),
          400
        );
      }

      const updateData: Record<string, unknown> = {};

      if (validation.data.scheduledAt) {
        updateData.scheduledAt = new Date(validation.data.scheduledAt);
      }
      if (validation.data.notes !== undefined) {
        updateData.notes = validation.data.notes;
      }
      if (validation.data.status) {
        updateData.status = validation.data.status;
      }
      if (validation.data.priority) {
        updateData.priority = validation.data.priority;
      }
      if (validation.data.completedAt) {
        updateData.completedAt = new Date(validation.data.completedAt);
      }

      const followUp = await prisma.followUp.update({
        where: { id },
        data: updateData,
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

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'update_followup',
          userId: sess.user.id,
          targetType: 'FollowUp',
          targetId: id,
          changes: {
            before: existingFollowUp,
            after: followUp,
          },
        },
      });

      return createApiResponse(followUp, 'Follow-up updated successfully');
    } catch (error) {
      console.error('Update follow-up error:', error);
      return createApiError('Failed to update follow-up', 500);
    }
  });
}
