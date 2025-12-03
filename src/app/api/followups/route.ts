import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { notifyFollowUpDue } from '@/shared/lib/utils/notification-service';

// GET follow-ups with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const leadId = searchParams.get('leadId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // If requesting follow-ups for a specific lead (e.g., lead detail page), return all
    if (leadId) {
      const where: any = { leadId };
      if (status) where.status = status;

      const [followUps, total] = await Promise.all([
        prisma.followUp.findMany({
          where,
          include: {
            lead: { select: { id: true, name: true, phone: true, status: true } },
            createdBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { scheduledAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.followUp.count({ where }),
      ]);

      return NextResponse.json({
        success: true,
        data: followUps,
        total,
        page,
        pageSize: limit,
        hasMore: skip + limit < total,
      });
    }

    // For the follow-up page, fetch only the NEXT pending follow-up per lead
    // Get all pending follow-ups
    const allFollowUps = await prisma.followUp.findMany({
      where: status ? { status } : { status: 'pending' },
      include: {
        lead: { select: { id: true, name: true, phone: true, status: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { scheduledAt: 'asc' }, // Order by earliest first
    });

    // Filter to keep only the NEXT (earliest pending) follow-up per lead
    const now = new Date();
    const nextFollowUpsMap = new Map<string, any>();
    
    for (const followUp of allFollowUps) {
      if (!nextFollowUpsMap.has(followUp.leadId)) {
        // For each lead, take the first follow-up we encounter (which is the earliest due to orderBy)
        nextFollowUpsMap.set(followUp.leadId, followUp);
      }
    }

    // Convert map to array and apply smart sorting:
    // 1. Upcoming follow-ups first (soonest/next one at the top)
    // 2. Overdue follow-ups last (most overdue first)
    const allFollowUpsArray = Array.from(nextFollowUpsMap.values());
    
    const overdue: any[] = [];
    const upcoming: any[] = [];
    
    allFollowUpsArray.forEach(followUp => {
      const scheduledDate = new Date(followUp.scheduledAt);
      if (scheduledDate < now && followUp.status === 'pending') {
        overdue.push(followUp);
      } else {
        upcoming.push(followUp);
      }
    });
    
    // Sort upcoming by scheduled date (earliest/next one first)
    upcoming.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    
    // Sort overdue by scheduled date (most overdue first)
    overdue.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    
    // Combine: upcoming first, then overdue
    const latestFollowUps = [...upcoming, ...overdue];

    // Apply pagination
    const total = latestFollowUps.length;
    const paginatedFollowUps = latestFollowUps.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      data: paginatedFollowUps,
      total,
      page,
      pageSize: limit,
      hasMore: skip + limit < total,
    });
  } catch (error) {
    console.error('Error fetching follow-ups:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch follow-ups' },
      { status: 500 }
    );
  }
}

// POST create new follow-up
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.customerRequirement || !body.customerRequirement.trim()) {
      return NextResponse.json(
        { success: false, error: 'Remarks is required' },
        { status: 400 }
      );
    }

    // Validate that scheduledAt is in the future
    const scheduledDateTime = new Date(body.scheduledAt);
    const now = new Date();
    if (scheduledDateTime <= now) {
      return NextResponse.json(
        { success: false, error: 'Follow-up date and time must be in the future' },
        { status: 400 }
      );
    }

    // Mark all previous pending follow-ups for this lead as completed
    // This ensures only the latest scheduled follow-up is active
    await prisma.followUp.updateMany({
      where: {
        leadId: body.leadId,
        status: 'pending',
      },
      data: {
        status: 'completed',
      },
    });

    const followUp = await prisma.followUp.create({
      data: {
        leadId: body.leadId,
        scheduledAt: scheduledDateTime,
        customerRequirement: body.customerRequirement || null,
        notes: body.notes || null,
        status: body.status || 'pending',
        createdById: body.createdById,
      },
      include: {
        lead: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Update lead status to 'followup' if it's not already won, lost, or unqualified
    const currentLead = await prisma.lead.findUnique({
      where: { id: body.leadId },
      select: { status: true },
    });

    const nonUpdatableStatuses = ['won', 'lost', 'unqualified'];
    if (currentLead && !nonUpdatableStatuses.includes(currentLead.status)) {
      await prisma.lead.update({
        where: { id: body.leadId },
        data: { status: 'followup' },
      });
    }

    // Log activity
    await prisma.activityHistory.create({
      data: {
        leadId: body.leadId,
        userId: body.createdById,
        action: 'followup_scheduled',
        description: `Follow-up scheduled for ${new Date(body.scheduledAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}`,
      },
    });

    // Send notification if follow-up is due within 24 hours
    const hoursUntilDue = (scheduledDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilDue <= 24 && followUp.lead) {
      const leadData = await prisma.lead.findUnique({
        where: { id: body.leadId },
        select: { assignedToId: true, name: true },
      });

      if (leadData?.assignedToId) {
        try {
          await notifyFollowUpDue(
            body.leadId,
            leadData.name,
            leadData.assignedToId,
            scheduledDateTime
          );
        } catch (error) {
          console.error('Failed to send follow-up notification:', error);
        }
      }
    }

    return NextResponse.json(
      { success: true, data: followUp },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating follow-up:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create follow-up' },
      { status: 500 }
    );
  }
}





