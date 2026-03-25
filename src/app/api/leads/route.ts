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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
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
    
    // Date range filter for createdAt
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lt = new Date(endDate);
      }
    }
    
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
      // DEFAULT BEHAVIOR: All roles can see all leads by default (unless "Assigned to Me" is checked)
      const canSeeAllLeads = true;
      
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
          CallLog: { 
            orderBy: { createdAt: 'desc' }, 
            take: 10,
            select: {
              id: true,
              remarks: true,
              callStatus: true,
              createdAt: true,
              startedAt: true,
              endedAt: true,
              duration: true,
              attemptNumber: true,
            }
          },
          FollowUp: {
            where: { status: { notIn: ['completed', 'cancelled'] } }, // Fetch all active follow-ups
            orderBy: { scheduledAt: 'desc' },
            take: 5,
            select: {
              id: true,
              scheduledAt: true,
              status: true,
              notes: true,
              customerRequirement: true,
              createdAt: true,
            }
          },
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

    // Check if lead with same phone number already exists
    const existingLead = await prisma.lead.findFirst({
      where: { phone: cleanedPhone },
      include: {
        User_Lead_assignedToIdToUser: { select: { id: true, name: true, email: true } },
        User_Lead_createdByIdToUser: { select: { id: true, name: true, email: true } },
      },
    });

    let lead;
    if (existingLead) {
      // Update existing lead instead of creating new one
      // Preserve: calls, remarks, callAttempts (not touched)
      
      // Cancel all active follow-ups so lead moves to NEW section
      await prisma.followUp.updateMany({
        where: {
          leadId: existingLead.id,
          status: { notIn: ['completed', 'cancelled'] },
        },
        data: {
          status: 'cancelled',
          completedAt: new Date(),
          notes: 'Auto-cancelled: New enquiry received for same lead',
          updatedAt: new Date(),
        },
      });
      
      lead = await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          name: body.name || existingLead.name,
          email: body.email || existingLead.email,
          alternatePhone: cleanedAltPhone || existingLead.alternatePhone,
          address: body.address || existingLead.address,
          city: body.city || existingLead.city,
          state: body.state || existingLead.state,
          pincode: body.pincode || existingLead.pincode,
          source: body.source || existingLead.source,
          campaign: body.campaign || existingLead.campaign,
          customerRequirement: body.customerRequirement || existingLead.customerRequirement,
          // Reset to 'new' for new enquiry, unless already converted/won
          status: ['won', 'converted'].includes(existingLead.status) 
            ? existingLead.status 
            : (body.status || 'new'),
          notes: existingLead.notes && body.notes
            ? `${existingLead.notes}\n\n[${new Date().toISOString()}] ${body.notes}`
            : body.notes || existingLead.notes,
          assignedToId: body.assignedToId || existingLead.assignedToId,
          createdAt: new Date(), // Reset lead age for new enquiry
          updatedAt: new Date(),
        },
        include: {
          User_Lead_assignedToIdToUser: { select: { id: true, name: true, email: true } },
          User_Lead_createdByIdToUser: { select: { id: true, name: true, email: true } },
        },
      });
    } else {
      // Determine assignedToId: use provided value or auto-assign via round-robin
      let assignedToId = body.assignedToId || null;
      
      // If not manually assigned, use round-robin auto-assignment
      if (!assignedToId) {
        assignedToId = await getNextAgentForRoundRobin();
      }

      // Create new lead
      lead = await prisma.lead.create({
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
    }

    // Log activity
    if (lead.id) {
      await prisma.activityHistory.create({
        data: {
          id: randomUUID(),
          leadId: lead.id,
          userId: body.createdById || 'system',
          action: existingLead ? 'updated' : 'created',
          description: existingLead
            ? `Lead "${lead.name}" was updated with new information. Merged with existing lead to preserve history.`
            : `Lead "${lead.name}" was created${!existingLead && lead.assignedToId && !body.assignedToId ? ' and auto-assigned' : ''}`,
        },
      });

      // Send notification if lead is assigned (only for new leads, not updates)
      if (!existingLead && lead.assignedToId && lead.assignedToId !== null) {
        try {
          const assignerName = body.createdById ? 
            (await prisma.user.findUnique({ where: { id: body.createdById } }))?.name ?? undefined : undefined;
          await notifyLeadAssigned(lead.id, lead.name, String(lead.assignedToId), assignerName);
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





