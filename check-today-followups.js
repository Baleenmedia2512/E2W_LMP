const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTodayFollowUps() {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    console.log('📅 Checking Follow-ups for TODAY (Dec 4, 2025)\n');
    console.log('Current Time:', now.toISOString());
    console.log('Today Start:', todayStart.toISOString());
    console.log('Today End:', todayEnd.toISOString());
    console.log('=' .repeat(80));

    // Get all follow-ups for active leads
    const allFollowUps = await prisma.followUp.findMany({
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
            status: true
          }
        }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    console.log(`\nTotal follow-ups for active leads: ${allFollowUps.length}`);
    console.log('=' .repeat(80));

    // Group by lead
    const followUpsByLead = new Map();
    for (const followUp of allFollowUps) {
      if (!followUpsByLead.has(followUp.leadId)) {
        followUpsByLead.set(followUp.leadId, []);
      }
      followUpsByLead.get(followUp.leadId).push(followUp);
    }

    console.log(`\nLeads with follow-ups: ${followUpsByLead.size}`);
    console.log('=' .repeat(80));

    // Find NEXT follow-up per lead and check if it's today
    const todayFollowUps = [];
    const futureFollowUps = [];
    const overdueFollowUps = [];

    for (const [leadId, followUps] of followUpsByLead.entries()) {
      const futureOnes = followUps.filter(f => new Date(f.scheduledAt) >= now);
      const pastOnes = followUps.filter(f => new Date(f.scheduledAt) < now);
      
      let nextFollowUp;
      
      if (futureOnes.length > 0) {
        nextFollowUp = futureOnes.reduce((earliest, current) => {
          return new Date(current.scheduledAt) < new Date(earliest.scheduledAt) ? current : earliest;
        });
      } else if (pastOnes.length > 0) {
        nextFollowUp = pastOnes.reduce((latest, current) => {
          return new Date(current.scheduledAt) > new Date(latest.scheduledAt) ? current : latest;
        });
      }

      if (nextFollowUp) {
        const scheduledDate = new Date(nextFollowUp.scheduledAt);
        
        if (scheduledDate >= todayStart && scheduledDate <= todayEnd) {
          // Today
          todayFollowUps.push({
            leadName: nextFollowUp.lead.name,
            scheduledAt: nextFollowUp.scheduledAt,
            isPast: scheduledDate < now
          });
        } else if (scheduledDate > todayEnd) {
          // Future
          futureFollowUps.push({
            leadName: nextFollowUp.lead.name,
            scheduledAt: nextFollowUp.scheduledAt
          });
        } else {
          // Overdue (before today)
          overdueFollowUps.push({
            leadName: nextFollowUp.lead.name,
            scheduledAt: nextFollowUp.scheduledAt
          });
        }
      }
    }

    console.log(`\n🔴 OVERDUE (before today): ${overdueFollowUps.length}`);
    if (overdueFollowUps.length > 0) {
      overdueFollowUps.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.leadName} - ${new Date(item.scheduledAt).toLocaleString()}`);
      });
    }

    console.log(`\n📅 FOLLOW-UPS TODAY: ${todayFollowUps.length}`);
    if (todayFollowUps.length > 0) {
      todayFollowUps.forEach((item, index) => {
        const status = item.isPast ? '(time passed)' : '(upcoming)';
        console.log(`  ${index + 1}. ${item.leadName} - ${new Date(item.scheduledAt).toLocaleString()} ${status}`);
      });
    }

    console.log(`\n🟢 FUTURE (after today): ${futureFollowUps.length}`);
    if (futureFollowUps.length > 0) {
      futureFollowUps.slice(0, 5).forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.leadName} - ${new Date(item.scheduledAt).toLocaleString()}`);
      });
    }

    console.log('\n' + '=' .repeat(80));
    console.log('\n📊 SUMMARY:');
    console.log(`   Overdue (before today): ${overdueFollowUps.length}`);
    console.log(`   Follow-ups Today: ${todayFollowUps.length}`);
    console.log(`   Future (after today): ${futureFollowUps.length}`);
    console.log('=' .repeat(80));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTodayFollowUps();
