import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';

// GET all leads with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const assignedToId = searchParams.get('assignedToId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) where.status = status;
    if (source) where.source = source;
    if (assignedToId) where.assignedToId = assignedToId;

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
          assignedTo: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: leads,
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
        role: {
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
      return agents[0].id;
    }

    // Find current agent's index
    const currentIndex = agents.findIndex(a => a.id === lastLead.assignedToId);
    
    // If agent not found or is last, start from beginning; otherwise next agent
    const nextIndex = currentIndex === -1 || currentIndex === agents.length - 1 
      ? 0 
      : currentIndex + 1;
    
    return agents[nextIndex].id;
  } catch (error) {
    console.error('Error in round-robin assignment:', error);
    return null;
  }
}

// POST create new lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Determine assignedToId: use provided value or auto-assign via round-robin
    let assignedToId = body.assignedToId || null;
    
    // If not manually assigned, use round-robin auto-assignment
    if (!assignedToId) {
      assignedToId = await getNextAgentForRoundRobin();
    }

    const lead = await prisma.lead.create({
      data: {
        name: body.name,
        phone: body.phone,
        email: body.email || null,
        alternatePhone: body.alternatePhone || null,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        pincode: body.pincode || null,
        source: body.source,
        campaign: body.campaign || null,
        customerRequirement: body.customerRequirement || null,
        status: body.status || 'new',
        priority: body.priority || 'medium',
        notes: body.notes || null,
        assignedToId: assignedToId,
        createdById: body.createdById || null,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Log activity
    if (lead.id) {
      await prisma.activityHistory.create({
        data: {
          leadId: lead.id,
          userId: body.createdById || 'system',
          action: 'created',
          description: `Lead "${lead.name}" was created${assignedToId && !body.assignedToId ? ' and auto-assigned' : ''}`,
        },
      });
    }

    return NextResponse.json(
      { success: true, data: lead },
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





