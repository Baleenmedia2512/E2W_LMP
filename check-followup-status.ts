import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const phonesToCheck = [
  '9500058076',
  '9158444110',
  '9514108157',
  '9940332803',
  '9344476511',
  '9840028543',
];

async function checkFollowupStatus() {
  console.log('Checking followup status for sample leads...\n');

  for (const phone of phonesToCheck) {
    const lead = await prisma.lead.findFirst({
      where: {
        phone: { contains: phone },
      },
      include: {
        FollowUp: {
          orderBy: { scheduledAt: 'desc' },
          take: 3,
        },
      },
    });

    if (lead) {
      console.log(`\n📋 ${lead.name} (${lead.phone})`);
      console.log(`   Lead Status: ${lead.status}`);
      console.log(`   Follow-ups found: ${lead.FollowUp.length}`);
      
      for (const fu of lead.FollowUp) {
        console.log(`   - ID: ${fu.id}`);
        console.log(`     Status: "${fu.status}"`);
        console.log(`     Scheduled: ${fu.scheduledAt}`);
        console.log(`     Note: ${fu.note?.substring(0, 50)}...`);
      }
    } else {
      console.log(`\n❌ Not found: ${phone}`);
    }
  }

  await prisma.$disconnect();
}

checkFollowupStatus().catch(console.error);
