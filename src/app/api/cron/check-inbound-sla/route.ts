import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import prisma from '@/shared/lib/db/prisma';
import { randomUUID } from 'crypto';

/**
 * Calculates the number of working minutes (10 AM - 6 PM) that have elapsed 
 * between the lead creation date and the current execution time.
 */
function getElapsedWorkingMinutes(createdAt: Date, now: Date): number {
  let totalMinutes = 0;
  // Create a moving pointer starting from the lead's creation time
  let current = new Date(createdAt.getTime());

  // Loop through each minute until we reach the current 'now' timestamp
  while (current < now) {
    const hours = current.getHours();
    
    // Check if the current pointer hour falls within working hours (10:00 AM to 5:59 PM)
    if (hours >= 10 && hours < 18) {
      totalMinutes++;
    }
    
    // Advance the pointer by 1 minute
    current.setMinutes(current.getMinutes() + 1);
  }

  return totalMinutes;
}

/**
 * Cron job: SLA check for INBOUND leads with 10 AM - 6 PM working hours restriction
 * Schedule: Every 10 minutes — "every-10-min"
 * URL: /api/cron/check-inbound-sla
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
    
    // 1. Calculate the follow-up task time:
    // If it's currently working hours, schedule it for 1 hour from now.
    // If it's outside working hours, schedule it for 11:00 AM of the next working day.
    let followUpScheduledAt = new Date(now.getTime() + 60 * 60 * 1000);
    const currentHour = now.getHours();
    
    if (currentHour < 10 || currentHour >= 18) {
      followUpScheduledAt = new Date(now);
      if (currentHour >= 18) {
        // If it's after 6 PM, push the follow-up task to 11 AM tomorrow
        followUpScheduledAt.setDate(followUpScheduledAt.getDate() + 1);
      }
      followUpScheduledAt.setHours(11, 0, 0, 0);
    }

    // 2. Fetch all potentially pending inbound leads
    const activeInboundLeads = await prisma.lead.findMany({
      where: {
        lead_category: 'INBOUND',
        status: 'new',
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

    // 3. Filter leads in-memory based on working hours elapsed
    const overdueInboundLeads = activeInboundLeads.filter((lead) => {
      const workingMinutesElapsed = getElapsedWorkingMinutes(lead.createdAt, now);
      // If it has been sitting in the queue for 60 working minutes or more, it breached SLA
      return workingMinutesElapsed >= 60;
    });

    console.log(`[SLA Cron] Found ${overdueInboundLeads.length} INBOUND leads that breached working hours SLA`);
    
    if (overdueInboundLeads.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No INBOUND leads breached working hours SLA',
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

      // 2. Create follow-up scheduled at calculated time
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
              notes: 'Auto-created by SLA system — INBOUND lead exceeded working hours response window',
              createdAt: now,
              updatedAt: now,
            },
          }).catch((err: any) => {
            console.error(`[SLA Cron] Failed to create follow-up for lead ${lead.id}:`, err);
          })
        );
      }

      // 3. Log to ActivityHistory
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
              description: `Lead automatically moved to Follow-up — Working hours SLA exceeded. Follow-up scheduled at ${followUpScheduledAt.toISOString()}.`,
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
      }

      // 4. Send notification to assigned agent
      if (lead.assignedToId) {
        notificationPromises.push(
          prisma.notification.create({
            data: {
              id: randomUUID(),
              userId: lead.assignedToId,
              type: 'warning',
              title: '⚠️ Inbound Lead SLA Breached',
              message: `Lead "${lead.name}" missed the inbound response window and has been moved to Follow-up. A follow-up is scheduled for ${followUpScheduledAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.`,
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

    // Execute status updates first
    await Promise.allSettled(statusUpdatePromises);

    // Then execute secondary actions in parallel
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