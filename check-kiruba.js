const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkKiruba() {
  try {
    console.log('🔍 Checking all "Kiruba" leads...\n');
    console.log('=' .repeat(80));

    const kirubaLeads = await prisma.lead.findMany({
      where: {
        name: {
          contains: 'iruba'
        }
      },
      include: {
        followUps: {
          orderBy: { scheduledAt: 'asc' }
        }
      }
    });

    console.log(`Found ${kirubaLeads.length} leads with "Kiruba" in name:\n`);

    for (const lead of kirubaLeads) {
      console.log(`Name: ${lead.name}`);
      console.log(`ID: ${lead.id}`);
      console.log(`Status: ${lead.status}`);
      console.log(`Created: ${lead.createdAt}`);
      console.log(`Follow-ups: ${lead.followUps.length}`);
      
      if (lead.followUps.length > 0) {
        console.log(`Follow-up dates:`);
        lead.followUps.forEach((f, index) => {
          const isOverdue = new Date(f.scheduledAt) < new Date();
          console.log(`  ${index + 1}. ${f.scheduledAt} ${isOverdue ? '❌ OVERDUE' : '✅ FUTURE'}`);
        });
        
        // Find NEXT follow-up (earliest)
        const nextFollowUp = lead.followUps[0];
        const isNextOverdue = new Date(nextFollowUp.scheduledAt) < new Date();
        console.log(`\n  NEXT Follow-up: ${nextFollowUp.scheduledAt}`);
        console.log(`  Is NEXT overdue? ${isNextOverdue ? '❌ YES' : '✅ NO'}`);
      }
      
      // Check if this lead would be counted in overdue
      const isActiveStatus = ['new', 'followup', 'qualified'].includes(lead.status);
      console.log(`\nActive status? ${isActiveStatus ? '✅ YES' : '❌ NO (status: ' + lead.status + ')'}`);
      
      if (isActiveStatus && lead.followUps.length > 0) {
        const nextFollowUp = lead.followUps[0];
        const isNextOverdue = new Date(nextFollowUp.scheduledAt) < new Date();
        console.log(`Should be in overdue list? ${isNextOverdue ? '✅ YES' : '❌ NO'}`);
      } else {
        console.log(`Should be in overdue list? ❌ NO (not active or no follow-ups)`);
      }
      
      console.log('\n' + '=' .repeat(80) + '\n');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkKiruba();
