import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createApiError } from '@/lib/api-middleware';
import { assignLeadSchema } from '@/lib/validations';
import { hasPermission } from '@/lib/roles';
import prisma from '@/lib/prisma';
import { Session } from 'next-auth';

export async function POST(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;

      if (!hasPermission(sess, 'users', 'assign')) {
        return createApiError('You do not have permission to assign leads', 403);
      }

      const body = await request.json();
      const validation = assignLeadSchema.safeParse(body);

      if (!validation.success) {
        return createApiError(
          'Validation failed: ' + validation.error.errors.map((e) => e.message).join(', '),
          400
        );
      }

      const { leadId, assignedToId, reason } = validation.data;

      // Verify lead exists
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
      });

      if (!lead) {
        return createApiError('Lead not found', 404);
      }

      // Verify user exists and is active
      const assignee = await prisma.user.findUnique({
        where: { id: assignedToId },
        include: { role: true },
      });

      if (!assignee || !assignee.isActive) {
        return createApiError('Invalid or inactive user', 400);
      }

      // Create undo log
      await prisma.undoLog.create({
        data: {
          userId: sess.user.id,
          action: 'assign_lead',
          targetType: 'Lead',
          targetId: leadId,
          previousState: { assignedToId: lead.assignedToId },
          expiresAt: new Date(Date.now() + 60000), // 60 seconds
        },
      });

      // Update lead assignment
      const updatedLead = await prisma.lead.update({
        where: { id: leadId },
        data: {
          assignedToId,
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      // Create assignment record
      await prisma.assignment.create({
        data: {
          leadId,
          assignedToId,
          assignedById: sess.user.id,
          assignmentType: 'manual',
          reason: reason || 'Manually assigned',
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'assign',
          userId: sess.user.id,
          targetType: 'Lead',
          targetId: leadId,
          changes: {
            before: { assignedToId: lead.assignedToId },
            after: { assignedToId },
          },
        },
      });

      // Create notification for assignee
      await prisma.notification.create({
        data: {
          userId: assignedToId,
          type: 'assignment',
          title: 'New Lead Assigned',
          message: `You have been assigned a new lead: ${lead.name}`,
          metadata: { leadId, assignedBy: sess.user.id },
        },
      });

      return createApiResponse(updatedLead, 'Lead assigned successfully');
    } catch (error) {
      console.error('Assign lead error:', error);
      return createApiError('Failed to assign lead', 500);
    }
  });
}

// Auto-assign leads to available agents
export async function GET(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;

      if (!hasPermission(sess, 'users', 'assign')) {
        return createApiError('You do not have permission to auto-assign leads', 403);
      }

      // Get unassigned leads
      const unassignedLeads = await prisma.lead.findMany({
        where: {
          assignedToId: null,
          status: 'new',
        },
        take: 100,
      });

      if (unassignedLeads.length === 0) {
        return createApiResponse({ assigned: 0 }, 'No unassigned leads found');
      }

      // Get active agents sorted by workload
      const agents = await prisma.user.findMany({
        where: {
          isActive: true,
          role: {
            name: {
              in: ['Agent', 'SuperAgent'],
            },
          },
        },
        include: {
          _count: {
            select: {
              assignedLeads: true,
            },
          },
        },
        orderBy: {
          assignedLeads: {
            _count: 'asc',
          },
        },
      });

      if (agents.length === 0) {
        return createApiError('No available agents found', 400);
      }

      let assignmentCount = 0;

      // Round-robin assignment
      for (let i = 0; i < unassignedLeads.length; i++) {
        const lead = unassignedLeads[i];
        const agent = agents[i % agents.length];

        if (agent && lead) {
          await prisma.lead.update({
            where: { id: lead.id },
            data: { assignedToId: agent.id },
          });

          await prisma.assignment.create({
            data: {
              leadId: lead.id,
              assignedToId: agent.id,
              assignedById: sess.user.id,
              assignmentType: 'auto',
              reason: 'Auto-assigned based on workload',
            },
          });

          await prisma.notification.create({
            data: {
              userId: agent.id,
              type: 'assignment',
              title: 'New Lead Auto-Assigned',
              message: `You have been auto-assigned a new lead: ${lead.name}`,
              metadata: { leadId: lead.id },
            },
          });

          assignmentCount++;
        }
      }

      return createApiResponse(
        { assigned: assignmentCount },
        `Successfully auto-assigned ${assignmentCount} leads`
      );
    } catch (error) {
      console.error('Auto-assign error:', error);
      return createApiError('Failed to auto-assign leads', 500);
    }
  });
}
