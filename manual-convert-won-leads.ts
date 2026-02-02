import prisma from './src/shared/lib/db/prisma';
import { randomUUID } from 'crypto';

/**
 * Manual script to convert won leads to followup based on today's day
 * This mimics the cron job logic but runs immediately for today
 */
async function manualConvertWonLeads() {
  try {
    const now = new Date();
    const currentDay = now.getDate();
    
    console.log(`\n=== Manual Won Leads Conversion ===`);
    console.log(`Current date: ${now.toLocaleString()}`);
    console.log(`Current day: ${currentDay}`);
    console.log(`Searching for won leads where day of updatedAt = ${currentDay}\n`);

    // Find all won leads where the day of updatedAt matches today's day
    const wonLeadsToConvert = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      phone: string;
      updatedAt: Date;
      assignedToId: string | null;
    }>>`
      SELECT id, name, phone, "updatedAt", "assignedToId"
      FROM "Lead"
      WHERE status = 'won'
      AND EXTRACT(DAY FROM "updatedAt") = ${currentDay}
    `;

    console.log(`Found ${wonLeadsToConvert.length} won leads to convert:\n`);

    if (wonLeadsToConvert.length === 0) {
      console.log('No won leads to convert for day', currentDay);
      return;
    }

    // Display the leads that will be converted
    wonLeadsToConvert.forEach((lead, index) => {
      console.log(`${index + 1}. ${lead.name} (${lead.phone})`);
      console.log(`   ID: ${lead.id}`);
      console.log(`   Won Date: ${lead.updatedAt.toLocaleString()}`);
      console.log(`   Assigned To: ${lead.assignedToId || 'Unassigned'}`);
      console.log('');
    });

    // Schedule follow-up for tomorrow at 10 AM
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    console.log(`Follow-ups will be scheduled for: ${tomorrow.toLocaleString()}\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const lead of wonLeadsToConvert) {
      try {
        console.log(`Converting: ${lead.name}...`);

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

        // Create activity log
        await prisma.activityHistory.create({
          data: {
            id: randomUUID(),
            leadId: lead.id,
            userId: 'system',
            action: 'status_changed',
            fieldName: 'status',
            oldValue: 'won',
            newValue: 'followup',
            description: `Lead auto-converted from won to followup (manual trigger for day ${currentDay})`,
            metadata: JSON.stringify({
              convertedAt: now.toISOString(),
              scheduledFollowUp: tomorrow.toISOString(),
              trigger: 'manual_script',
              dayMatch: currentDay,
            }),
          },
        });

        console.log(`✓ Successfully converted: ${lead.name}`);
        successCount++;
      } catch (error: any) {
        console.error(`✗ Failed to convert lead ${lead.id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n=== Conversion Complete ===`);
    console.log(`Success: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Total: ${wonLeadsToConvert.length}`);

  } catch (error: any) {
    console.error('Error in manual conversion:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
manualConvertWonLeads()
  .then(() => {
    console.log('\nScript completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed:', error);
    process.exit(1);
  });
