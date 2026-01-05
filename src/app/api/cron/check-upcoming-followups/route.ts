import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import prisma from '@/shared/lib/db/prisma';
import { notifyFollowUpDue } from '@/shared/lib/utils/notification-service';

/**
 * Cron job to check for upcoming follow-ups and send reminder notifications
 * Schedule: Run every 15 minutes via cron job
 * URL: /api/cron/check-upcoming-followups
 * 
 * This job:
 * 1. Finds all pending follow-ups scheduled within the next hour
 * 2. Sends reminder notifications to assigned agents
 * 3. Prevents duplicate notifications by tracking sent reminders
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
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // Find follow-ups that are pending and due within the next hour
    const upcomingFollowUps = await prisma.followUp.findMany({
      where: {
        status: 'pending',
        scheduledAt: {
          gte: now,
          lte: oneHourFromNow,
        },
      },
      include: {
        Lead: {
          select: {
            id: true,
            name: true,
            assignedToId: true,
          },
        },
      },
    });

    console.log(`Found ${upcomingFollowUps.length} follow-ups due within the next hour`);

    const notificationPromises = [];

    for (const followUp of upcomingFollowUps) {
      // Only create notification if lead is assigned to someone
      if (followUp.Lead.assignedToId) {
        // Check if we've already sent a reminder for this follow-up in the last hour
        const recentNotification = await prisma.notification.findFirst({
          where: {
            userId: followUp.Lead.assignedToId,
            relatedLeadId: followUp.Lead.id,
            type: 'info',
            createdAt: {
              gte: new Date(now.getTime() - 60 * 60 * 1000), // Last hour
            },
            message: {
              contains: followUp.Lead.name,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        // Only send notification if we haven't sent one recently
        if (!recentNotification) {
          notificationPromises.push(
            notifyFollowUpDue(
              followUp.Lead.id,
              followUp.Lead.name,
              followUp.Lead.assignedToId,
              followUp.scheduledAt
            ).catch((error: any) => {
              console.error(`Failed to send upcoming notification for follow-up ${followUp.id}:`, error);
            })
          );
        } else {
          console.log(`Skipping duplicate notification for follow-up ${followUp.id}`);
        }
      }
    }

    // Execute all notifications (non-blocking)
    await Promise.allSettled(notificationPromises);

    return NextResponse.json({
      success: true,
      message: `Processed ${upcomingFollowUps.length} upcoming follow-ups`,
      data: {
        upcomingCount: upcomingFollowUps.length,
        notificationsSent: notificationPromises.length,
        timestamp: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in upcoming follow-ups cron job:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process upcoming follow-ups',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
