import { NextRequest } from 'next/server';
import { createApiResponse, createApiError } from '@/lib/api-middleware';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

/**
 * Cron Job - Trigger Follow-ups at 9 AM
 * 
 * This endpoint should be called by a cron service (Vercel Cron, GitHub Actions, etc.)
 * 
 * To set up in Vercel:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/followups",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key-change-in-production';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return createApiError('Unauthorized', 401);
    }

    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    // Find all pending follow-ups scheduled for today
    const dueFollowUps = await prisma.followUp.findMany({
      where: {
        status: 'pending',
        scheduledAt: {
          gte: startOfToday,
          lte: endOfToday,
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
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log(`[Cron] Found ${dueFollowUps.length} follow-ups due today`);

    // Create notifications for each assigned agent
    const notificationsCreated: string[] = [];
    
    for (const followUp of dueFollowUps) {
      if (followUp.lead.assignedToId) {
        try {
          await prisma.notification.create({
            data: {
              userId: followUp.lead.assignedToId,
              type: 'follow_up_due',
              title: 'Follow-up Due Today',
              message: `Follow-up scheduled for ${followUp.lead.name} (${followUp.lead.phone})`,
              metadata: {
                followUpId: followUp.id,
                leadId: followUp.lead.id,
                leadName: followUp.lead.name,
                scheduledAt: followUp.scheduledAt.toISOString(),
                priority: followUp.priority,
              },
            },
          });
          notificationsCreated.push(followUp.id);
        } catch (error) {
          console.error(`[Cron] Failed to create notification for follow-up ${followUp.id}:`, error);
        }
      }
    }

    // Update lead status to followup if not already
    const leadsToUpdate = dueFollowUps
      .filter((f) => f.lead.assignedToId)
      .map((f) => f.lead.id);

    if (leadsToUpdate.length > 0) {
      await prisma.lead.updateMany({
        where: {
          id: {
            in: leadsToUpdate,
          },
          status: {
            not: 'followup',
          },
        },
        data: {
          status: 'followup',
        },
      });
    }

    console.log(`[Cron] Created ${notificationsCreated.length} notifications`);

    return createApiResponse({
      success: true,
      followUpsDue: dueFollowUps.length,
      notificationsCreated: notificationsCreated.length,
      timestamp: new Date().toISOString(),
    }, `Processed ${dueFollowUps.length} follow-ups`);
    
  } catch (error) {
    console.error('[Cron] Follow-up trigger error:', error);
    return createApiError('Failed to process follow-ups', 500);
  }
}

// Allow POST as well for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
