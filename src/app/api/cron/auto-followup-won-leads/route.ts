import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

/**
 * Cron Job: Auto-convert won leads to followup
 * Runs daily - checks if today's date matches the day when lead was won
 * Example: If today is Jan 19, find all won leads that were won on any 19th (any month/year)
 * and convert them to followup status with a scheduled follow-up
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (Vercel adds this header)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const currentDay = today.getDate(); // e.g., 19

    console.log(`[Cron] Auto-followup check running for day: ${currentDay}`);

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

    if (wonLeadsToConvert.length === 0) {
      console.log(`[Cron] No won leads found for day ${currentDay}`);
      return NextResponse.json({
        success: true,
        message: `No won leads to convert for day ${currentDay}`,
        converted: 0,
      });
    }

    console.log(`[Cron] Found ${wonLeadsToConvert.length} won leads to convert to followup`);

    // Schedule follow-up for tomorrow at 10 AM
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const convertedLeads = [];
    const errors = [];

    // Convert each lead
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
            id: uuidv4(),
            leadId: lead.id,
            scheduledAt: tomorrow,
            status: 'pending',
            priority: 'medium',
            notes: `Auto-converted from won status (matched day ${currentDay}). Please follow up with this client.`,
            createdById: lead.assignedToId || '', // Use assigned user or empty string
            updatedAt: new Date(),
          },
        });

        convertedLeads.push({
          id: lead.id,
          name: lead.name,
          wonDate: lead.updatedAt,
        });

        console.log(`[Cron] Converted lead: ${lead.name} (${lead.id})`);
      } catch (error: any) {
        errors.push({
          leadId: lead.id,
          leadName: lead.name,
          error: error.message,
        });
        console.error(`[Cron] Failed to convert lead ${lead.id}:`, error.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Converted ${convertedLeads.length} won leads to followup status`,
      currentDay,
      converted: convertedLeads.length,
      leads: convertedLeads,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('[Cron] Auto-followup error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process auto-followup',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
