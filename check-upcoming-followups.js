const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUpcomingFollowUps() {
  try {
    const now = new Date();
    
    console.log('🔍 Checking UPCOMING Follow-ups for Dashboard\n');
    console.log('Current Time:', now.toISOString());
    console.log('=' .repeat(80));

    // Get follow-ups exactly as the dashboard does
    const upcomingFollowUps = await prisma.followUp.findMany({
      where: {
        lead: {
          status: {
            in: ['new', 'followup', 'qualified']
          }
        }
      },
      include: {
        lead: { 
          select: { 
            id: true, 
            name: true, 
            phone: true, 
            status: true 
          } 
        }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    console.log(`\nTotal follow-ups from active leads: ${upcomingFollowUps.length}\n`);

    // Filter only future ones
    const futureFollowUps = [];
    const processedLeads = new Set();

    for (const followUp of upcomingFollowUps) {
      if (processedLeads.has(followUp.leadId)) continue;
      
      const scheduledDate = new Date(followUp.scheduledAt);
      if (scheduledDate >= now) {
        futureFollowUps.push({
          leadName: followUp.lead.name,
          leadStatus: followUp.lead.status,
          scheduledAt: followUp.scheduledAt,
          notes: followUp.notes || followUp.customerRequirement || '-'
        });
        processedLeads.add(followUp.leadId);
      }
    }

    console.log(`🟢 UPCOMING (Future) Follow-ups: ${futureFollowUps.length}`);
    console.log('=' .repeat(80));
    
    if (futureFollowUps.length > 0) {
      futureFollowUps.slice(0, 5).forEach((item, index) => {
        console.log(`\n${index + 1}. Lead: ${item.leadName}`);
        console.log(`   Status: ${item.leadStatus}`);
        console.log(`   Scheduled: ${new Date(item.scheduledAt).toLocaleString()}`);
        console.log(`   Notes: ${item.notes}`);
      });
    } else {
      console.log('\n❌ No upcoming follow-ups found!');
      console.log('\nPossible reasons:');
      console.log('  1. All follow-ups are in the past (overdue)');
      console.log('  2. Leads have inactive status (won, lost, unreachable, unqualified)');
      console.log('  3. No follow-ups scheduled for future dates');
    }

    console.log('\n' + '=' .repeat(80));

    // Show all leads with their status
    console.log('\n📋 ALL LEADS WITH FOLLOW-UPS:\n');
    const allLeadsWithFollowups = await prisma.lead.findMany({
      where: {
        followUps: {
          some: {}
        }
      },
      select: {
        id: true,
        name: true,
        status: true,
        followUps: {
          orderBy: { scheduledAt: 'desc' },
          take: 1,
          select: {
            scheduledAt: true
          }
        }
      }
    });

    allLeadsWithFollowups.forEach((lead, index) => {
      const isActive = ['new', 'followup', 'qualified'].includes(lead.status);
      const statusIcon = isActive ? '✅' : '❌';
      const latestFollowUp = lead.followUps[0]?.scheduledAt;
      console.log(`${index + 1}. ${statusIcon} ${lead.name} - Status: ${lead.status} - Latest: ${new Date(latestFollowUp).toLocaleString()}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUpcomingFollowUps();
