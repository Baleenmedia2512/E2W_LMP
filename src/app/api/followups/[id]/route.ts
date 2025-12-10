import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { notifyFollowUpStatusChange, notifyFollowUpRescheduled, notifyFollowUpUpdated } from '@/shared/lib/utils/notification-service';
import { 
  shouldNotifyFollowUpStatusChange,
  determineFollowUpStatus,
  formatStatusChangeMessage
} from '@/shared/lib/utils/followup-status-utils';
import { randomUUID } from 'crypto';

// PUT/PATCH update follow-up
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Get the existing followup to compare status changes
    const existingFollowUp = await prisma.followUp.findUnique({
      where: { id: params.id },
      include: {
        Lead: { 
          select: { 
            id: true, 
            name: true, 
            assignedToId: true 
          } 
        },
      },
    });

    if (!existingFollowUp) {
      return NextResponse.json(
        { success: false, error: 'Follow-up not found' },
        { status: 404 }
      );
    }

    // Determine new status using utility function if not explicitly provided
    let newStatus = body.status;
    if (!newStatus) {
      newStatus = determineFollowUpStatus(
        body.scheduledAt ? new Date(body.scheduledAt) : existingFollowUp.scheduledAt,
        body.completedAt !== undefined ? (body.completedAt ? new Date(body.completedAt) : null) : existingFollowUp.completedAt,
        existingFollowUp.status as any
      );
    }

    const updateData: any = {
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      completedAt: body.completedAt ? (body.completedAt === null ? null : new Date(body.completedAt)) : undefined,
      customerRequirement: body.customerRequirement !== undefined ? body.customerRequirement : undefined,
      notes: body.notes !== undefined ? body.notes : undefined,
      status: newStatus || undefined,
      updatedAt: new Date(),
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const followUp = await prisma.followUp.update({
      where: { id: params.id },
      data: updateData,
      include: {
        Lead: { select: { id: true, name: true } },
        User: { select: { id: true, name: true, email: true } },
      },
    });

    // Check for status change and send notification
    const oldStatus = existingFollowUp.status;
    const currentStatus = followUp.status;
    
    const statusChange = shouldNotifyFollowUpStatusChange(oldStatus as any, currentStatus as any);
    
    if (statusChange.shouldNotify && existingFollowUp.Lead.assignedToId && body.updatedById) {
      try {
        await notifyFollowUpStatusChange(
          existingFollowUp.Lead.id,
          existingFollowUp.Lead.name,
          existingFollowUp.Lead.assignedToId,
          oldStatus,
          currentStatus
        );

        // Log activity for status change using formatted message
        await prisma.activityHistory.create({
          data: {
            id: randomUUID(),
            leadId: existingFollowUp.Lead.id,
            userId: body.updatedById,
            action: 'followup_status_changed',
            fieldName: 'status',
            oldValue: oldStatus,
            newValue: currentStatus,
            description: formatStatusChangeMessage('followup', 'status', oldStatus, currentStatus, existingFollowUp.Lead.name),
            metadata: JSON.stringify({
              followUpId: params.id,
              timestamp: new Date().toISOString(),
              notificationType: statusChange.notificationType,
            }),
          },
        });
      } catch (notificationError) {
        console.error('Failed to send follow-up status change notification:', notificationError);
        // Don't fail the update if notification fails
      }
    }

    // Check for schedule change (reschedule) and send notification
    const oldScheduledAt = existingFollowUp.scheduledAt;
    const newScheduledAt = followUp.scheduledAt;
    
    if (body.scheduledAt && oldScheduledAt.getTime() !== newScheduledAt.getTime() && existingFollowUp.Lead.assignedToId) {
      try {
        await notifyFollowUpRescheduled(
          existingFollowUp.Lead.id,
          existingFollowUp.Lead.name,
          existingFollowUp.Lead.assignedToId,
          newScheduledAt
        );
        console.log('Follow-up reschedule notification sent successfully');
      } catch (notificationError) {
        console.error('Failed to send follow-up reschedule notification:', notificationError);
      }
    }

    // Check for other changes and send general update notification
    const hasOtherChanges = 
      (body.customerRequirement !== undefined && body.customerRequirement !== existingFollowUp.customerRequirement) ||
      (body.notes !== undefined && body.notes !== existingFollowUp.notes);

    if (hasOtherChanges && existingFollowUp.Lead.assignedToId && body.updatedById) {
      try {
        let changesSummary = '';
        if (body.customerRequirement !== undefined && body.customerRequirement !== existingFollowUp.customerRequirement) {
          changesSummary += 'Customer requirement updated. ';
        }
        if (body.notes !== undefined && body.notes !== existingFollowUp.notes) {
          changesSummary += 'Notes updated.';
        }

        await notifyFollowUpUpdated(
          existingFollowUp.Lead.id,
          existingFollowUp.Lead.name,
          existingFollowUp.Lead.assignedToId,
          changesSummary.trim()
        );
        console.log('Follow-up updated notification sent successfully');
      } catch (notificationError) {
        console.error('Failed to send follow-up updated notification:', notificationError);
      }
    }

    return NextResponse.json({ success: true, data: followUp });
  } catch (error) {
    console.error('Error updating follow-up:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update follow-up' },
      { status: 500 }
    );
  }
}

// PATCH also works for updates
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return PUT(request, { params });
}

// DELETE follow-up
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.followUp.delete({ where: { id: params.id } });

    return NextResponse.json(
      { success: true, message: 'Follow-up deleted successfully' }
    );
  } catch (error) {
    console.error('Error deleting follow-up:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete follow-up' },
      { status: 500 }
    );
  }
}
