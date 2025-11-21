import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createApiError } from '@/lib/api-middleware';
import { canAccessResource } from '@/lib/roles';
import prisma from '@/lib/prisma';
import { Session } from 'next-auth';
import { z } from 'zod';
import { createUndoLog } from '@/lib/undo-helper';

const updateStatusSchema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'followup', 'won', 'lost', 'unreach', 'unqualified']),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;
      const { id } = params;

      const existingLead = await prisma.lead.findUnique({
        where: { id },
      });

      if (!existingLead) {
        return createApiError('Lead not found', 404);
      }

      // Check access permissions
      if (!canAccessResource(sess, 'leads', existingLead.assignedToId || undefined)) {
        return createApiError('You do not have permission to update this lead', 403);
      }

      const body = await request.json();
      const validation = updateStatusSchema.safeParse(body);

      if (!validation.success) {
        return createApiError(
          'Validation failed: ' + validation.error.errors.map((e) => e.message).join(', '),
          400
        );
      }

      const { status, reason, notes, metadata } = validation.data;

      // Create undo log BEFORE making changes
      await createUndoLog({
        userId: sess.user.id,
        action: 'update_status',
        targetType: 'Lead',
        targetId: id,
        previousState: {
          status: existingLead.status,
          notes: existingLead.notes,
          metadata: existingLead.metadata,
        },
      });

      // Update lead status
      const lead = await prisma.lead.update({
        where: { id },
        data: {
          status,
          notes: notes || existingLead.notes,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : existingLead.metadata,
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Create audit log with conversion details
      await prisma.auditLog.create({
        data: {
          action: 'status_change',
          userId: sess.user.id,
          targetType: 'Lead',
          targetId: lead.id,
          changes: {
            before: { status: existingLead.status },
            after: { status, reason, notes },
          },
        },
      });

      // Create notification if lead is assigned to someone else
      if (lead.assignedToId && lead.assignedToId !== sess.user.id) {
        const statusMessages: Record<string, string> = {
          followup: 'has been marked for follow-up',
          unreach: 'has been marked as unreachable',
          unqualified: 'has been marked as unqualified',
          new: 'status has been reset to new',
        };

        await prisma.notification.create({
          data: {
            userId: lead.assignedToId,
            type: 'lead_status_changed',
            title: 'Lead Status Changed',
            message: `Lead "${lead.name}" ${statusMessages[status] || 'status has been updated'}`,
            metadata: { leadId: lead.id, oldStatus: existingLead.status, newStatus: status },
          },
        });
      }

      return createApiResponse(lead, 'Lead status updated successfully');
    } catch (error) {
      console.error('Update lead status error:', error);
      return createApiError('Failed to update lead status', 500);
    }
  });
}
