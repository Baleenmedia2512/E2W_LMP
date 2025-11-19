import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createApiError } from '@/lib/api-middleware';
import { updateLeadSchema } from '@/lib/validations';
import { canAccessResource, hasPermission } from '@/lib/roles';
import prisma from '@/lib/prisma';
import { Session } from 'next-auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;
      const { id } = params;

      const lead = await prisma.lead.findUnique({
        where: { id },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          callLogs: {
            include: {
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
            take: 10,
          },
          followUps: {
            include: {
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
          },
        },
      });

      if (!lead) {
        return createApiError('Lead not found', 404);
      }

      // Check access permissions
      if (!canAccessResource(sess, 'leads', lead.assignedToId || undefined)) {
        return createApiError('You do not have permission to view this lead', 403);
      }

      return createApiResponse(lead);
    } catch (error) {
      console.error('Get lead error:', error);
      return createApiError('Failed to fetch lead', 500);
    }
  });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

      if (!hasPermission(sess, 'leads', 'update')) {
        return createApiError('You do not have permission to update leads', 403);
      }

      const body = await request.json();
      const validation = updateLeadSchema.safeParse(body);

      if (!validation.success) {
        return createApiError(
          'Validation failed: ' + validation.error.errors.map((e) => e.message).join(', '),
          400
        );
      }

      // Create undo log
      await prisma.undoLog.create({data: {
          userId: sess.user.id,
          action: 'update_lead',
          targetType: 'Lead',
          targetId: id,
          previousState: JSON.parse(JSON.stringify(existingLead)),
          expiresAt: new Date(Date.now() + 60000), // 60 seconds
        },
      });

      const lead = await prisma.lead.update({
        where: { id },
        data: {
          ...validation.data,
          metadata: validation.data.metadata ? JSON.parse(JSON.stringify(validation.data.metadata)) : undefined,
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

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'update',
          userId: sess.user.id,
          targetType: 'Lead',
          targetId: lead.id,
          changes: {
            before: existingLead,
            after: lead,
          },
        },
      });

      return createApiResponse(lead, 'Lead updated successfully');
    } catch (error) {
      console.error('Update lead error:', error);
      return createApiError('Failed to update lead', 500);
    }
  });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;
      const { id } = params;

      if (!hasPermission(sess, 'leads', 'delete')) {
        return createApiError('You do not have permission to delete leads', 403);
      }

      const existingLead = await prisma.lead.findUnique({
        where: { id },
      });

      if (!existingLead) {
        return createApiError('Lead not found', 404);
      }

      // Create undo log
      await prisma.undoLog.create({
        data: {
          userId: sess.user.id,
          action: 'delete_lead',
          targetType: 'Lead',
          targetId: id,
          previousState: JSON.parse(JSON.stringify(existingLead)),
          expiresAt: new Date(Date.now() + 60000), // 60 seconds
        },
      });

      await prisma.lead.delete({
        where: { id },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'delete',
          userId: sess.user.id,
          targetType: 'Lead',
          targetId: id,
          changes: { before: existingLead },
        },
      });

      return createApiResponse(null, 'Lead deleted successfully');
    } catch (error) {
      console.error('Delete lead error:', error);
      return createApiError('Failed to delete lead', 500);
    }
  });
}
