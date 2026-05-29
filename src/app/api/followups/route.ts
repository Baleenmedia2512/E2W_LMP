import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { notifyFollowUpDue, notifyLeadFollowUpStageChange, notifyFollowUpRescheduled, notifyFollowUpAdded } from '@/shared/lib/utils/notification-service';
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

    // Get the lead to find createdById if not provided
    let createdById = body.createdById;
    if (!createdById) {
      const lead = await prisma.lead.findUnique({
        where: { id: body.leadId },
        select: { assignedToId: true, createdById: true },
      });
      // Use assignedToId or createdById from lead, or fallback to a system user
      createdById = lead?.assignedToId || lead?.createdById;
      
      if (!createdById) {
        // If still no user, try to get the first active user
        const firstUser = await prisma.user.findFirst({
          where: { isActive: true },
          select: { id: true },
        });
        createdById = firstUser?.id;
      }
      
      if (!createdById) {
        return NextResponse.json(
          { success: false, error: 'Unable to determine user for follow-up creation' },
          { status: 400 }
        );
      }
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

    // Get all pending follow-ups for this lead
    const allPendingFollowUps = await prisma.followUp.findMany({
      where: {
        leadId: body.leadId,
        status: 'pending',
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // Separate future and past follow-ups
    const futureFollowUps = allPendingFollowUps.filter((f: any) => new Date(f.scheduledAt) >= now);
    const pastFollowUps = allPendingFollowUps.filter((f: any) => new Date(f.scheduledAt) < now);

    // Determine which follow-up to update (prefer future, otherwise most recent past)
    let followUpToUpdate = futureFollowUps[0] || pastFollowUps[pastFollowUps.length - 1];

    if (followUpToUpdate) {
      // Update the selected follow-up
      const updatedFollowUp = await prisma.followUp.update({
        where: { id: followUpToUpdate.id },
        data: {
          scheduledAt: scheduledDateTime,
          customerRequirement: body.customerRequirement?.trim() || 'Follow-up rescheduled',
          notes: body.notes?.trim() || null,
          updatedAt: new Date(),
        },
        include: {
          Lead: { select: { id: true, name: true } },
          User: { select: { id: true, name: true, email: true } },
        },
      });

      // Delete all other pending follow-ups for this lead (clean up duplicates)
      const otherFollowUpIds = allPendingFollowUps
        .filter((f: any) => f.id !== followUpToUpdate.id)
        .map((f: any) => f.id);

      if (otherFollowUpIds.length > 0) {
        await prisma.followUp.deleteMany({
          where: {
            id: { in: otherFollowUpIds },
          },
        });
      }

      // Log activity for rescheduling
      await prisma.activityHistory.create({
        data: {
          id: randomUUID(),
          leadId: body.leadId,
          userId: createdById,
          action: 'followup_rescheduled',
          description: `Follow-up rescheduled to ${scheduledDateTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/\//g, '-')} ${scheduledDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
        },
      });

      // Fire reschedule notification in background — user does NOT wait for this
      prisma.lead.findUnique({
        where: { id: body.leadId },
        select: { assignedToId: true, name: true },
      }).then((leadData) => {
        const notificationRecipient = leadData?.assignedToId || createdById;
        if (notificationRecipient) {
          notifyFollowUpRescheduled(
            body.leadId,
            leadData?.name || 'Lead',
            notificationRecipient,
            scheduledDateTime
          ).catch((err: unknown) => console.error('Failed to send follow-up reschedule notification:', err));
        }
      }).catch((err: unknown) => console.error('Failed to fetch lead for reschedule notification:', err));

      // Return response immediately
      return NextResponse.json(
        { success: true, data: updatedFollowUp },
        { status: 200 }
      );
    }

    // Create new follow-up if none exists
    const followUp = await prisma.followUp.create({
      data: {
        id: randomUUID(),
        leadId: body.leadId,
        scheduledAt: scheduledDateTime,
        customerRequirement: body.customerRequirement?.trim() || 'Follow-up scheduled',
        notes: body.notes?.trim() || null,
        createdById: createdById,
        updatedAt: new Date(),
      },
      include: {
        Lead: { select: { id: true, name: true } },
        User: { select: { id: true, name: true, email: true } },
      },
    });

    // Update lead status to 'followup' if it's not already won, lost, or unqualified
    // Allow override for won status if explicitly requested (for rescheduling won leads)
    const currentLead = await prisma.lead.findUnique({
      where: { id: body.leadId },
      select: { status: true, assignedToId: true, name: true },
    });

    const nonUpdatableStatuses = ['lost', 'unqualified'];
    const allowWonOverride = body.allowWonOverride === true; // New flag to allow rescheduling won leads
    
    // Check if we should update the status
    const shouldUpdateStatus = currentLead && (
      !nonUpdatableStatuses.includes(currentLead.status) || 
      (currentLead.status === 'won' && allowWonOverride)
    );
    
    if (shouldUpdateStatus) {
      const oldStatus = currentLead.status;
      
      // If it was won and we're overriding, store the won status in metadata
      const updateData: any = { 
        status: 'followup',
        updatedAt: new Date(),
      };
      
      // Store previous won status in notes/metadata if it was won
      if (oldStatus === 'won' && allowWonOverride) {
        const existingNotes = (await prisma.lead.findUnique({
          where: { id: body.leadId },
          select: { notes: true }
        }))?.notes || '';
        
        const wonRescheduleNote = `[Previous Status: WON - Rescheduled for follow-up on ${new Date().toLocaleDateString()}]`;
        updateData.notes = existingNotes 
          ? `${existingNotes}\n${wonRescheduleNote}` 
          : wonRescheduleNote;
      }

      // Parallelize lead update + activity log creation
      const leadUpdateOp = prisma.lead.update({
        where: { id: body.leadId },
        data: updateData,
      });

      const activityOp = prisma.activityHistory.create({
        data: {
          id: randomUUID(),
          leadId: body.leadId,
          userId: createdById,
          action: 'followup_scheduled',
          description: `Follow-up scheduled for ${new Date(scheduledDateTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/\//g, '-')}`,
        },
      });

      await Promise.all([leadUpdateOp, activityOp]);

      // Fire notifications in background — reuse currentLead, user does NOT wait
      const notificationRecipient = currentLead.assignedToId || createdById;

      if (oldStatus !== 'followup' && currentLead.assignedToId) {
        notifyLeadFollowUpStageChange(
          body.leadId,
          currentLead.name,
          currentLead.assignedToId,
          oldStatus,
          'followup'
        ).catch((err: unknown) => console.error('Failed to send lead follow-up stage change notification:', err));
      }

      if (notificationRecipient) {
        notifyFollowUpAdded(
          body.leadId,
          currentLead.name || 'Lead',
          notificationRecipient,
          scheduledDateTime
        ).catch((err: unknown) => console.error('Failed to send follow-up added notification:', err));

        const hoursUntilDue = (scheduledDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        const isTomorrow = scheduledDateTime.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
        if (hoursUntilDue <= 24 || isTomorrow) {
          notifyFollowUpDue(
            body.leadId,
            currentLead.name || 'Lead',
            notificationRecipient,
            scheduledDateTime
          ).catch((err: unknown) => console.error('Failed to send follow-up due notification:', err));
        }
      }
    } else {
      // Just create activity log if status update skipped
      await prisma.activityHistory.create({
        data: {
          id: randomUUID(),
          leadId: body.leadId,
          userId: createdById,
          action: 'followup_scheduled',
          description: `Follow-up scheduled for ${new Date(scheduledDateTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/\//g, '-')}`,
        },
      });

      // Fire notification in background
      const notificationRecipient = currentLead?.assignedToId || createdById;
      if (notificationRecipient) {
        notifyFollowUpAdded(
          body.leadId,
          currentLead?.name || 'Lead',
          notificationRecipient,
          scheduledDateTime
        ).catch((err: unknown) => console.error('Failed to send follow-up added notification:', err));
      }
    }

    // Return response immediately — all notifications already fired in background
    return NextResponse.json(
      { success: true, data: followUp },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating follow-up:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create follow-up',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}





