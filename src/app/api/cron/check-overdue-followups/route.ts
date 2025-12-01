import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';

/**
 * Cron job to check for overdue follow-ups and create notifications
 * Schedule: Run every hour via cron job
 * URL: /api/cron/check-overdue-followups
 * 
 * This job:
 * 1. Finds all pending follow-ups that are now overdue
 * 2. Creates notifications for assigned agents
 * 3. Marks follow-ups to prevent duplicate notifications
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
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Find follow-ups that became overdue in the last hour
    // This prevents sending duplicate notifications on every run
    const overdueFollowUps = await prisma.followUp.findMany({
      where: {
        status: 'pending',
        scheduledAt: {
          gte: oneHourAgo,
          lt: now,
        },
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            assignedToId: true,
          },
        },
      },
    });

    console.log(`Found ${overdueFollowUps.length} newly overdue follow-ups`);

    // Create notifications for each overdue follow-up
    const notifications = await Promise.all(
      overdueFollowUps.map(async (followUp) => {
        // Only create notification if lead is assigned to someone
        if (!followUp.lead.assignedToId) {
          return null;
        }

        // Check if notification already exists for this follow-up
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: followUp.lead.assignedToId,
            type: 'FOLLOWUP_OVERDUE',
            relatedLeadId: followUp.leadId,
            metadata: {
              path: ['followUpId'],
              equals: followUp.id,
            },
          },
        });

        if (existingNotification) {
          console.log(`Notification already exists for follow-up ${followUp.id}`);
          return null;
        }

        // Calculate days overdue
        const diffTime = now.getTime() - new Date(followUp.scheduledAt).getTime();
        const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Create notification
        return prisma.notification.create({
          data: {
            userId: followUp.lead.assignedToId,
            type: 'FOLLOWUP_OVERDUE',
            title: followUp.priority === 'high' 
              ? '🔴 High Priority Follow-up Overdue!'
              : '⚠️ Follow-up Overdue',
            message: `Follow-up with ${followUp.lead.name} is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue. Please take action immediately.`,
            relatedLeadId: followUp.leadId,
            metadata: {
              followUpId: followUp.id,
              priority: followUp.priority,
              daysOverdue,
              leadName: followUp.lead.name,
              leadPhone: followUp.lead.phone,
            },
          },
        });
      })
    );

    const createdNotifications = notifications.filter(n => n !== null);

    return NextResponse.json({
      success: true,
      message: `Processed ${overdueFollowUps.length} overdue follow-ups, created ${createdNotifications.length} notifications`,
      data: {
        overdueCount: overdueFollowUps.length,
        notificationsCreated: createdNotifications.length,
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
