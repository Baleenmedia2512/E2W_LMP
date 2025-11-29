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

    const where: any = {};
    if (leadId) where.leadId = leadId;
    if (status) where.status = status;

    const [followUps, total] = await Promise.all([
      prisma.followUp.findMany({
        where,
        include: {
          lead: { select: { id: true, name: true, phone: true, status: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { scheduledAt: 'asc' },
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
        { success: false, error: 'Customer requirement is required' },
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

    const followUp = await prisma.followUp.create({
      data: {
        leadId: body.leadId,
        scheduledAt: scheduledDateTime,
        completedAt: body.completedAt ? new Date(body.completedAt) : null,
        customerRequirement: body.customerRequirement,
        notes: body.notes || null,
        status: body.status || 'pending',
        priority: body.priority || 'medium',
        createdById: body.createdById,
      },
      include: {
        lead: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Log activity
    await prisma.activityHistory.create({
      data: {
        leadId: body.leadId,
        userId: body.createdById,
        action: 'followup_scheduled',
        description: `Follow-up scheduled for ${new Date(body.scheduledAt).toLocaleDateString()}`,
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





