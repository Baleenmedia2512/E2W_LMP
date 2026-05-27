import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import prisma from '@/shared/lib/db/prisma';
import { randomUUID } from 'crypto';

/**
 * Cron job: SLA check for INBOUND leads
 * Schedule: Every 10 minutes — "every-10-min"
 * URL: /api/cron/check-inbound-sla
 *
 * Business rule:
 *   IF lead_category = 'INBOUND'
 *   AND status = 'new'
 *   AND createdAt < (now - 1 hour)
 *   THEN:
 *     - Update status → 'followup'
 *     - Create a FollowUp record scheduled at now + 1 hour
 *     - Log to ActivityHistory
 *     - Send notification to assigned agent
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
    const followUpScheduledAt = new Date(now.getTime() + 60 * 60 * 1000); // now + 1 hour

    // Find all INBOUND leads that are still NEW and older than 1 hour
    // Also ensure no active (non-cancelled/completed) follow-up already exists
    // to prevent duplicate follow-up creation
    const overdueInboundLeads = await prisma.lead.findMany({
      where: {
        lead_category: 'INBOUND',
        status: 'new',
        createdAt: {
          lt: oneHourAgo,
        },
        // Only pick leads that have NO active follow-up already
        FollowUp: {
          none: {
            status: { notIn: ['completed', 'cancelled'] },
          },
        },
      },
      select: {
        id: true,
        name: true,
        assignedToId: true,
        createdAt: true,
      },
    });

    console.log(`[SLA Cron] Found ${overdueInboundLeads.length} INBOUND leads that breached 1-hour SLA`);

    if (overdueInboundLeads.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No INBOUND leads breached SLA',
        data: { processed: 0, timestamp: now.toISOString() },
      });
    }

    const statusUpdatePromises = [];
    const followUpCreatePromises = [];
    const activityPromises = [];
    const notificationPromises = [];

    for (const lead of overdueInboundLeads) {
      const followUpId = randomUUID();

      // 1. Update lead status: new → followup
      statusUpdatePromises.push(
        prisma.lead.update({
          where: { id: lead.id },
          data: {
            status: 'followup',
            updatedAt: now,
          },
        })
      );

      // 2. Create follow-up scheduled at now + 1 hour
      // Only create if lead has an assigned agent — createdById is a required FK to User table
      if (lead.assignedToId) {
        followUpCreatePromises.push(
          prisma.followUp.create({
            data: {
              id: followUpId,
              leadId: lead.id,
              scheduledAt: followUpScheduledAt,
              status: 'pending',
              priority: 'high',
              createdById: lead.assignedToId,
              notes: 'Auto-created by SLA system — INBOUND lead exceeded 1-hour response window',
              createdAt: now,
              updatedAt: now,
            },
          }).catch((err: any) => {
            console.error(`[SLA Cron] Failed to create follow-up for lead ${lead.id}:`, err);
          })
        );
      }

      // 3. Log to ActivityHistory — only if assigned agent exists (userId is a required FK)
      if (lead.assignedToId) {
      activityPromises.push(
        prisma.activityHistory.create({
          data: {
            id: randomUUID(),
            leadId: lead.id,
            userId: lead.assignedToId,
            action: 'status_changed',
            fieldName: 'status',
            oldValue: 'new',
            newValue: 'followup',
            description: `Lead automatically moved to Follow-up — INBOUND SLA of 1 hour exceeded. Follow-up scheduled at ${followUpScheduledAt.toISOString()}.`,
            metadata: JSON.stringify({
              trigger: 'inbound_sla_cron',
              slaWindowHours: 1,
              leadCreatedAt: lead.createdAt.toISOString(),
              followUpScheduledAt: followUpScheduledAt.toISOString(),
              processedAt: now.toISOString(),
            }),
            createdAt: now,
          },
        }).catch((err: any) => {
          console.error(`[SLA Cron] Failed to create activity for lead ${lead.id}:`, err);
        })
      );
      } // end if (lead.assignedToId) for ActivityHistory

      // 4. Send notification to assigned agent (if any)
      if (lead.assignedToId) {
        notificationPromises.push(
          prisma.notification.create({
            data: {
              id: randomUUID(),
              userId: lead.assignedToId,
              type: 'warning',
              title: '⚠️ Inbound Lead SLA Breached',
              message: `Lead "${lead.name}" missed the 1-hour inbound response window and has been moved to Follow-up. A follow-up is scheduled for ${followUpScheduledAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.`,
              isRead: false,
              relatedLeadId: lead.id,
              createdAt: now,
            },
          }).catch((err: any) => {
            console.error(`[SLA Cron] Failed to create notification for lead ${lead.id}:`, err);
          })
        );
      }
    }

    // Execute status updates first (most critical)
    await Promise.allSettled(statusUpdatePromises);

    // Then execute follow-up creation, activity logs, and notifications in parallel
    await Promise.allSettled([
      ...followUpCreatePromises,
      ...activityPromises,
      ...notificationPromises,
    ]);

    console.log(`[SLA Cron] Successfully processed ${overdueInboundLeads.length} leads`);

    return NextResponse.json({
      success: true,
      message: `Processed ${overdueInboundLeads.length} INBOUND leads that breached SLA`,
      data: {
        processed: overdueInboundLeads.length,
        followUpScheduledAt: followUpScheduledAt.toISOString(),
        timestamp: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('[SLA Cron] Error in check-inbound-sla cron job:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process INBOUND SLA check',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
