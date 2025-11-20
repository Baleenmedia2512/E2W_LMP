import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createApiError } from '@/lib/api-middleware';
import { createLeadSchema, leadFilterSchema, paginationSchema } from '@/lib/validations';
import { hasPermission } from '@/lib/roles';
import prisma from '@/lib/prisma';
import { Session } from 'next-auth';

export async function GET(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;
      const searchParams = request.nextUrl.searchParams;

      // Parse pagination
      const page = parseInt(searchParams.get('page') || '1');
      const pageSize = parseInt(searchParams.get('pageSize') || '20');

      const paginationValidation = paginationSchema.safeParse({ page, pageSize });
      if (!paginationValidation.success) {
        return createApiError('Invalid pagination parameters', 400);
      }

      // Parse filters
      const filters = {
        status: searchParams.get('status') || undefined,
        source: searchParams.get('source') || undefined,
        priority: searchParams.get('priority') || undefined,
        assignedToId: searchParams.get('assignedToId') || undefined,
        search: searchParams.get('search') || undefined,
      };

      const filterValidation = leadFilterSchema.safeParse(filters);
      if (!filterValidation.success) {
        return createApiError('Invalid filter parameters', 400);
      }

      // Build where clause based on role
      const where: Record<string, unknown> = {};

      // Role-based filtering - SuperAgent sees all, Agent sees only assigned
      if (sess.user.role === 'Agent') {
        where.assignedToId = sess.user.id;
      }
      // SuperAgent/Admin sees all leads - no additional filter needed

      // Apply filters
      if (filterValidation.data.status) {
        where.status = filterValidation.data.status;
      }
      if (filterValidation.data.source) {
        where.source = filterValidation.data.source;
      }
      if (filterValidation.data.priority) {
        where.priority = filterValidation.data.priority;
      }
      
      // Handle assignedToId filter including 'null' for unassigned
      if (filterValidation.data.assignedToId) {
        if (filterValidation.data.assignedToId === 'null') {
          where.assignedToId = null;
        } else {
          where.assignedToId = filterValidation.data.assignedToId;
        }
      }
      
      // Search functionality - handle empty/null search
      if (filterValidation.data.search && filterValidation.data.search.trim().length > 0) {
        const searchTerm = filterValidation.data.search.trim();
        where.OR = [
          { name: { contains: searchTerm } },
          { email: { contains: searchTerm } },
          { phone: { contains: searchTerm } },
          { alternatePhone: { contains: searchTerm } },
          { city: { contains: searchTerm } },
          { notes: { contains: searchTerm } },
        ];
      }

      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where,
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
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
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.lead.count({ where }),
      ]);

      return createApiResponse({
        data: leads,
        total,
        page,
        pageSize,
        hasMore: total > page * pageSize,
      });
    } catch (error) {
      console.error('Get leads error:', error);
      return createApiError('Failed to fetch leads', 500);
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;

      if (!hasPermission(sess, 'leads', 'create')) {
        return createApiError('You do not have permission to create leads', 403);
      }

      const body = await request.json();
      const validation = createLeadSchema.safeParse(body);

      if (!validation.success) {
        return createApiError(
          'Validation failed: ' + validation.error.errors.map((e) => e.message).join(', '),
          400
        );
      }

      // Handle role-based assignment logic
      let assignedToId = validation.data.assignedToId;
      
      // If user is Agent (not SuperAgent), auto-assign to themselves
      if (sess.user.role === 'Agent') {
        assignedToId = sess.user.id;
      }
      // If SuperAgent provided an assignedToId, use it; otherwise leave unassigned
      // SuperAgent can create unassigned leads

      const lead = await prisma.lead.create({
        data: {
          ...validation.data,
          assignedToId: assignedToId || null,
          createdById: sess.user.id,
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

      // Create assignment record if assigned
      if (assignedToId) {
        await prisma.assignment.create({
          data: {
            leadId: lead.id,
            assignedToId: assignedToId,
            assignedById: sess.user.id,
            assignmentType: sess.user.role === 'Agent' ? 'auto' : 'manual',
            reason: sess.user.role === 'Agent' ? 'Self-created lead' : 'Manually assigned by SuperAgent',
          },
        });
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'create',
          userId: sess.user.id,
          targetType: 'Lead',
          targetId: lead.id,
          changes: { after: lead },
        },
      });

      // Create notification for assigned agent (if not self)
      if (assignedToId && assignedToId !== sess.user.id) {
        await prisma.notification.create({
          data: {
            userId: assignedToId,
            type: 'lead_assigned',
            title: 'New Lead Assigned',
            message: `A new lead "${lead.name}" has been assigned to you`,
            metadata: { leadId: lead.id },
          },
        });
      }

      return createApiResponse(lead, 'Lead created successfully');
    } catch (error) {
      console.error('Create lead error:', error);
      return createApiError('Failed to create lead', 500);
    }
  });
}
