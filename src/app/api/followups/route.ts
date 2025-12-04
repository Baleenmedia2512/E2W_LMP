import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { notifyFollowUpDue } from '@/shared/lib/utils/notification-service';
import { randomUUID } from 'crypto';

// GET follow-ups with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const leadId = searchParams.get('leadId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // If requesting follow-ups for a specific lead (e.g., lead detail page), return all
    if (leadId) {
      const where: any = { leadId };

      const [followUps, total] = await Promise.all([
        prisma.followUp.findMany({
          where,
          include: {
            Lead: { select: { id: true, name: true, phone: true, status: true } },
            User: { select: { id: true, name: true, email: true } },
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

    // For the follow-up page or leads list, fetch all follow-ups
    // The client-side logic will determine which is the "next" follow-up
    const allFollowUps = await prisma.followUp.findMany({
      include: {
        Lead: { select: { id: true, name: true, phone: true, status: true } },
        User: { select: { id: true, name: true, email: true } },
      },
      orderBy: { scheduledAt: 'asc' }, // Order by earliest first
      take: limit * 10, // Get more records since we're not filtering per lead
    });

    return NextResponse.json({
      success: true,
      data: allFollowUps,
      total: allFollowUps.length,
      page,
      pageSize: limit,
      hasMore: false,
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

    const followUp = await prisma.followUp.create({
      data: {
        id: randomUUID(),
        leadId: body.leadId,
        scheduledAt: scheduledDateTime,
        customerRequirement: body.customerRequirement || null,
        notes: body.notes || null,
        createdById: body.createdById,
        updatedAt: new Date(),
      },
      include: {
        Lead: { select: { id: true, name: true } },
        User: { select: { id: true, name: true, email: true } },
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
        id: randomUUID(),
        leadId: body.leadId,
        userId: body.createdById,
        action: 'followup_scheduled',
        description: `Follow-up scheduled for ${new Date(body.scheduledAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}`,
      },
    });

    // Send notification if follow-up is due within 24 hours
    const hoursUntilDue = (scheduledDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilDue <= 24 && followUp.Lead) {
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





