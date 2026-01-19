import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import prisma from '@/shared/lib/db/prisma';
import { notifyFollowUpOverdue, notifyFollowUpStatusChange } from '@/shared/lib/utils/notification-service';
import { randomUUID } from 'crypto';

/**
 * Cron job to check for overdue follow-ups and auto-convert won leads
 * Schedule: Run daily at midnight (0 0 * * *)
 * URL: /api/cron/check-overdue-followups
 * 
 * This job:
 * 1. Finds all pending follow-ups that are now overdue
 * 2. Updates their status to 'overdue'
 * 3. Creates notifications for assigned agents
 * 4. Auto-converts won leads to followup (if won day matches today's day)
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

    // ========================================
    // AUTO-CONVERT WON LEADS TO FOLLOWUP
    // ========================================
    const currentDay = now.getDate();
    let autoConvertedCount = 0;

    try {
      console.log(`[Auto-Convert] Checking won leads for day: ${currentDay}`);

      // Find all won leads where the day of updatedAt matches today's day
      const wonLeadsToConvert = await prisma.$queryRaw<Array<{
        id: string;
        name: string;
        updatedAt: Date;
        assignedToId: string | null;
      }>>`
        SELECT id, name, "updatedAt", "assignedToId"
        FROM "Lead"
        WHERE status = 'won'
        AND EXTRACT(DAY FROM "updatedAt") = ${currentDay}
      `;

      if (wonLeadsToConvert.length > 0) {
        console.log(`[Auto-Convert] Found ${wonLeadsToConvert.length} won leads to convert`);

        // Schedule follow-up for tomorrow at 10 AM
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);

        for (const lead of wonLeadsToConvert) {
          try {
            // Update lead status to followup
            await prisma.lead.update({
              where: { id: lead.id },
              data: {
                status: 'followup',
                updatedAt: new Date(),
              },
            });

            // Create a follow-up record
            await prisma.followUp.create({
              data: {
                id: randomUUID(),
                leadId: lead.id,
                scheduledAt: tomorrow,
                status: 'pending',
                priority: 'medium',
                notes: `Auto-converted from won status (matched day ${currentDay}). Please follow up with this client.`,
                createdById: lead.assignedToId || '',
                updatedAt: new Date(),
              },
            });

            autoConvertedCount++;
            console.log(`[Auto-Convert] Converted: ${lead.name}`);
          } catch (error: any) {
            console.error(`[Auto-Convert] Failed to convert lead ${lead.id}:`, error.message);
          }
        }
      }
    } catch (error: any) {
      console.error('[Auto-Convert] Error:', error.message);
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${pendingOverdueFollowUps.length} overdue follow-ups and auto-converted ${autoConvertedCount} won leads`,
      data: {
        overdueCount: pendingOverdueFollowUps.length,
        autoConvertedCount,
        currentDay,
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
