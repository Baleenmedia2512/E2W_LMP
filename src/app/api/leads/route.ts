import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { notifyLeadAssigned } from '@/shared/lib/utils/notification-service';
import { normalizePhoneForStorage, isValidPhone, getPhoneValidationError } from '@/shared/utils/phone';
import { randomUUID } from 'crypto';
import { extractTokenFromHeader, verifyToken } from '@/shared/lib/auth/auth-utils';

// GET all leads with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const assignedTo = searchParams.get('assigned_to');
    const assignedToId = searchParams.get('assignedToId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Extract user from JWT token for authentication and filtering
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    let currentUserId: string | null = null;
    let currentUserRole: string | null = null;
    
    if (token) {
      const payload = verifyToken(token);
      if (payload && payload.userId) {
        currentUserId = payload.userId;
        currentUserRole = payload.roleName;
      }
    }

    const where: any = {};

    if (status) where.status = status;
    if (source) where.source = source;
    
    // Handle assigned_to filtering
    if (assignedTo === 'me') {
      // Explicit filter: show only leads assigned to current user
      if (currentUserId) {
        where.assignedToId = currentUserId;
      }
    } else if (assignedToId) {
      // Explicit assignedToId parameter
      where.assignedToId = assignedToId;
    } else if (currentUserId) {
      // DEFAULT BEHAVIOR: Always filter by current user UNLESS they are Team Lead or Super Agent
      // Team Lead and Super Agent can see all leads by default (unless "Assigned to Me" is checked)
      const canSeeAllLeads = currentUserRole === 'Team Lead' || currentUserRole === 'Super Agent';
      
      if (!canSeeAllLeads) {
        // Normal agents (Sales Agent) ALWAYS see only their assigned leads
        where.assignedToId = currentUserId;
      }
      // Team Lead and Super Agent: no filter applied, they see all leads
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          User_Lead_assignedToIdToUser: { select: { id: true, name: true, email: true } },
          User_Lead_createdByIdToUser: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    // Transform the response to match frontend expectations
    const transformedLeads = leads.map((lead: any) => ({
      ...lead,
      assignedTo: lead.User_Lead_assignedToIdToUser,
      createdBy: lead.User_Lead_createdByIdToUser,
      User_Lead_assignedToIdToUser: undefined,
      User_Lead_createdByIdToUser: undefined,
    }));

    return NextResponse.json({
      success: true,
      data: transformedLeads,
      total,
      page,
      pageSize: limit,
      hasMore: skip + limit < total,
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}

// Helper function for round-robin assignment
async function getNextAgentForRoundRobin(): Promise<string | null> {
  try {
    // Get all active sales agents
    const agents = await prisma.user.findMany({
      where: {
        isActive: true,
        Role: {
          name: {
            in: ['sales_agent', 'team_lead'],
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (agents.length === 0) return null;

    // Get the last assigned lead to determine next agent in rotation
    const lastLead = await prisma.lead.findFirst({
      where: {
        assignedToId: {
          not: null,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        assignedToId: true,
      },
    });

    // If no previous leads or no assignment, start with first agent
    if (!lastLead || !lastLead.assignedToId) {
      return agents[0]?.id || null;
    }

    // Find current agent's index
    const currentIndex = agents.findIndex((a: any) => a.id === lastLead.assignedToId);
    
    // If agent not found or is last, start from beginning; otherwise next agent
    const nextIndex = currentIndex === -1 || currentIndex === agents.length - 1 
      ? 0 
      : currentIndex + 1;
    
    return agents[nextIndex]?.id || null;
  } catch (error) {
    console.error('Error in round-robin assignment:', error);
    return null;
  }
}

// POST create new lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // AC-4 & AC-6: Clean and validate phone numbers
    const cleanedPhone = normalizePhoneForStorage(body.phone);
    const cleanedAltPhone = body.alternatePhone ? normalizePhoneForStorage(body.alternatePhone) : null;
    
    // Validate main phone
    if (!isValidPhone(cleanedPhone)) {
      const error = getPhoneValidationError(body.phone);
      return NextResponse.json(
        { success: false, error: error || 'Invalid phone number' },
        { status: 400 }
      );
    }

    // Determine assignedToId: use provided value or auto-assign via round-robin
    let assignedToId = body.assignedToId || null;
    
    // If not manually assigned, use round-robin auto-assignment
    if (!assignedToId) {
      assignedToId = await getNextAgentForRoundRobin();
    }

    const lead = await prisma.lead.create({
      data: {
        id: randomUUID(),
        name: body.name,
        phone: cleanedPhone,
        email: body.email || null,
        alternatePhone: cleanedAltPhone,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        pincode: body.pincode || null,
        source: body.source,
        campaign: body.campaign || null,
        customerRequirement: body.customerRequirement || null,
        status: body.status || 'new',
        notes: body.notes || null,
        assignedToId: assignedToId,
        createdById: body.createdById || null,
        updatedAt: new Date(),
      },
      include: {
        User_Lead_assignedToIdToUser: { select: { id: true, name: true, email: true } },
        User_Lead_createdByIdToUser: { select: { id: true, name: true, email: true } },
      },
    });

    // Log activity
    if (lead.id) {
      await prisma.activityHistory.create({
        data: {
          id: randomUUID(),
          leadId: lead.id,
          userId: body.createdById || 'system',
          action: 'created',
          description: `Lead "${lead.name}" was created${assignedToId && !body.assignedToId ? ' and auto-assigned' : ''}`,
        },
      });

      // Send notification if lead is assigned
      if (assignedToId && assignedToId !== null) {
        try {
          const assignerName = body.createdById ? 
            (await prisma.user.findUnique({ where: { id: body.createdById } }))?.name : undefined;
          // TODO: Fix TypeScript type narrowing issue
          // await notifyLeadAssigned(lead.id, lead.name, String(assignedToId), assignerName);
        } catch (error) {
          console.error('Failed to send lead assignment notification:', error);
        }
      }
    }

    // Transform the response to match frontend expectations
    const transformedLead = {
      ...lead,
      assignedTo: lead.User_Lead_assignedToIdToUser,
      createdBy: lead.User_Lead_createdByIdToUser,
      User_Lead_assignedToIdToUser: undefined,
      User_Lead_createdByIdToUser: undefined,
    };

    return NextResponse.json(
      { success: true, data: transformedLead },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create lead' },
      { status: 500 }
    );
  }
}





