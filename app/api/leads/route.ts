import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createApiError } from '@/lib/api-middleware';
import { createLeadSchema, leadFilterSchema, paginationSchema } from '@/lib/validations';
import { hasPermission } from '@/lib/roles';
import prisma from '@/lib/prisma';
import { Session } from 'next-auth';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { rateLimit, getRateLimitHeaders } from '@/lib/middleware/rateLimiter';
import { sanitizeSearchQuery, sanitizeLeadData } from '@/lib/middleware/sanitize';

export async function GET(request: NextRequest) {
  // Apply rate limiting (100 requests per minute for GET)
  const rateLimitResult = await rateLimit({ maxRequests: 100, windowMs: 60000 })(request);
  if (rateLimitResult) return rateLimitResult;

  return withAuth(async (session) => {
    try {
      const sess = session as Session;
      const searchParams = request.nextUrl.searchParams;

      // Parse pagination with higher limits
      const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
      const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));

      const paginationValidation = paginationSchema.safeParse({ page, pageSize });
      if (!paginationValidation.success) {
        return createApiError('Invalid pagination parameters', 400);
      }

      // Parse and sanitize filters
      const filters = {
        status: searchParams.get('status') || undefined,
        source: searchParams.get('source') || undefined,
        priority: searchParams.get('priority') || undefined,
        assignedToId: searchParams.get('assignedToId') || undefined,
        search: sanitizeSearchQuery(searchParams.get('search')) || undefined,
      };

      const dateFilter = searchParams.get('dateFilter'); // 'today', 'week', 'month'

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

      // Date filter - filter by creation date
      if (dateFilter) {
        const today = new Date();
        const startOfToday = startOfDay(today);
        const endOfToday = endOfDay(today);

        switch (dateFilter) {
          case 'today':
            where.createdAt = {
              gte: startOfToday,
              lte: endOfToday,
            };
            break;
          case 'week':
            where.createdAt = {
              gte: subDays(startOfToday, 7),
              lte: endOfToday,
            };
            break;
          case 'month':
            where.createdAt = {
              gte: subDays(startOfToday, 30),
              lte: endOfToday,
            };
            break;
        }
      }

      // Optimize query with select to reduce payload
      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where,
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            alternatePhone: true,
            city: true,
            state: true,
            source: true,
            status: true,
            priority: true,
            createdAt: true,
            updatedAt: true,
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
              },
            },
            _count: {
              select: {
                callLogs: true,
                followUps: true,
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

      // Apply priority-based sorting: New (1), Followup (2), Unreach (3), Unqualified (4)
      const statusPriority: Record<string, number> = {
        new: 1,
        followup: 2,
        unreach: 3,
        unqualified: 4,
      };

      const sortedLeads = leads.sort((a, b) => {
        const priorityA = statusPriority[a.status.toLowerCase()] || 999;
        const priorityB = statusPriority[b.status.toLowerCase()] || 999;
        return priorityA - priorityB;
      });

      return createApiResponse({
        data: sortedLeads,
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
  // Apply rate limiting (20 requests per minute for POST)
  const rateLimitResult = await rateLimit({ maxRequests: 20, windowMs: 60000 })(request);
  if (rateLimitResult) return rateLimitResult;

  return withAuth(async (session) => {
    try {
      const sess = session as Session;

      if (!hasPermission(sess, 'leads', 'create')) {
        return createApiError('You do not have permission to create leads', 403);
      }

      const body = await request.json();
      
      // Sanitize input data
      const sanitizedData = sanitizeLeadData(body);
      
      const validation = createLeadSchema.safeParse(sanitizedData);

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

      // US-033: Create notifications for new lead
      const notificationsToCreate = [];

      // If lead is assigned to someone else, notify them
      if (assignedToId && assignedToId !== sess.user.id) {
        notificationsToCreate.push({
          userId: assignedToId,
          type: 'new_lead_assigned',
          title: 'New Lead Assigned',
          message: `New lead "${lead.name}" has been assigned to you`,
          metadata: {
            leadId: lead.id,
            leadName: lead.name,
            createdBy: sess.user.name || sess.user.email,
            assignedTo: lead.assignedTo?.name || lead.assignedTo?.email,
          },
        });
      }

      // If created by employee (Agent), notify SuperAdmin
      if (sess.user.role === 'Agent') {
        // Find all SuperAgents to notify
        const superAgents = await prisma.user.findMany({
          where: {
            role: {
              name: 'SuperAgent',
            },
            isActive: true,
          },
          select: {
            id: true,
          },
        });

        superAgents.forEach((superAgent) => {
          if (superAgent.id !== sess.user.id) {
            notificationsToCreate.push({
              userId: superAgent.id,
              type: 'new_lead_created',
              title: 'New Lead Created',
              message: `${sess.user.name || sess.user.email} created a new lead "${lead.name}"`,
              metadata: {
                leadId: lead.id,
                leadName: lead.name,
                createdBy: sess.user.name || sess.user.email,
                assignedTo: lead.assignedTo?.name || lead.assignedTo?.email || 'Unassigned',
              },
            });
          }
        });
      }

      // Create all notifications
      if (notificationsToCreate.length > 0) {
        await prisma.notification.createMany({
          data: notificationsToCreate,
        });
      }

      return createApiResponse(lead, 'Lead created successfully');
    } catch (error) {
      console.error('Create lead error:', error);
      return createApiError('Failed to create lead', 500);
    }
  });
}