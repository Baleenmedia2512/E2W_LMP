import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import prisma from '@/shared/lib/db/prisma';
import { notifyFollowUpOverdue, notifyFollowUpStatusChange } from '@/shared/lib/utils/notification-service';
import { randomUUID } from 'crypto';

/**
 * Cron job to check for overdue follow-ups and create notifications
 * Schedule: Run every hour via cron job
 * URL: /api/cron/check-overdue-followups
 * 
 * This job:
 * 1. Finds all pending follow-ups that are now overdue
 * 2. Updates their status to 'overdue'
 * 3. Creates notifications for assigned agents
 * 4. Marks follow-ups to prevent duplicate notifications
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();

    // Find follow-ups that are pending and overdue (scheduled time has passed)
    const pendingOverdueFollowUps = await prisma.followUp.findMany({
      where: {
        status: 'pending',
        scheduledAt: {
          lt: now,
        },
      },
      include: {
        Lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            assignedToId: true,
            priority: true,
          },
        },
      },
    });

    console.log(`Found ${pendingOverdueFollowUps.length} pending follow-ups that are now overdue`);

    const updatePromises = [];
    const notificationPromises = [];
    const activityPromises = [];

    for (const followUp of pendingOverdueFollowUps) {
      // Update followup status to overdue
      updatePromises.push(
        prisma.followUp.update({
          where: { id: followUp.id },
          data: { 
            status: 'overdue',
            updatedAt: new Date(),
          },
        })
      );

      // Only create notification if lead is assigned to someone
      if (followUp.Lead.assignedToId) {
        // Send status change notification
        notificationPromises.push(
          notifyFollowUpStatusChange(
            followUp.Lead.id,
            followUp.Lead.name,
            followUp.Lead.assignedToId,
            'pending',
            'overdue'
          ).catch((error: any) => {
            console.error(`Failed to send status change notification for follow-up ${followUp.id}:`, error);
          })
        );

        // Send overdue notification using the priority
        notificationPromises.push(
          notifyFollowUpOverdue(
            followUp.Lead.id,
            followUp.Lead.name,
            followUp.Lead.assignedToId,
            followUp.Lead.priority || 'medium'
          ).catch((error: any) => {
            console.error(`Failed to send overdue notification for follow-up ${followUp.id}:`, error);
          })
        );
      }

      // Create activity log for status change
      activityPromises.push(
        prisma.activityHistory.create({
          data: {
            id: randomUUID(),
            leadId: followUp.Lead.id,
            userId: 'system', // System-generated activity
            action: 'followup_status_changed',
            fieldName: 'status',
            oldValue: 'pending',
            newValue: 'overdue',
            description: `Follow-up automatically marked as overdue (scheduled: ${followUp.scheduledAt.toLocaleDateString()})`,
            metadata: JSON.stringify({
              followUpId: followUp.id,
              scheduledAt: followUp.scheduledAt.toISOString(),
              overdueAt: now.toISOString(),
              trigger: 'cron_job',
            }),
          },
        }).catch((error: any) => {
          console.error(`Failed to create activity log for follow-up ${followUp.id}:`, error);
        })
      );
    }

    // Execute all updates first (most critical)
    await Promise.allSettled(updatePromises);
    
    // Then execute notifications and activities (non-blocking)
    await Promise.allSettled([...notificationPromises, ...activityPromises]);

    return NextResponse.json({
      success: true,
      message: `Processed ${pendingOverdueFollowUps.length} overdue follow-ups`,
      data: {
        overdueCount: pendingOverdueFollowUps.length,
        timestamp: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in overdue follow-ups cron job:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process overdue follow-ups',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
