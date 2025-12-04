const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTodayFollowUpsFix() {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    console.log('✅ Testing Fixed "Follow-up Today" Logic\n');
    console.log('Current Time:', now.toISOString());
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
            name: true
          }
        }
      }
    });

    // Group by lead
    const followUpsByLead = new Map();
    for (const followUp of allFollowUps) {
      if (!followUpsByLead.has(followUp.leadId)) {
        followUpsByLead.set(followUp.leadId, []);
      }
      followUpsByLead.get(followUp.leadId).push(followUp);
    }

    // Find NEXT follow-up per lead
    const leadFollowUpMap = new Map();
    
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
        leadFollowUpMap.set(leadId, nextFollowUp);
      }
    }

    // Count TODAY's FUTURE follow-ups only
    let followUpsDueCount = 0;
    const todayFutureFollowUps = [];

    for (const followUp of leadFollowUpMap.values()) {
      const scheduledDate = new Date(followUp.scheduledAt);
      // Count only TODAY's follow-ups that are in the FUTURE
      if (scheduledDate >= now && scheduledDate >= todayStart && scheduledDate <= todayEnd) {
        followUpsDueCount++;
        todayFutureFollowUps.push({
          leadName: followUp.lead.name,
          scheduledAt: followUp.scheduledAt
        });
      }
    }

    console.log(`\n📅 FOLLOW-UPS TODAY (Future time only): ${followUpsDueCount}`);
    if (todayFutureFollowUps.length > 0) {
      todayFutureFollowUps.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.leadName} - ${new Date(item.scheduledAt).toLocaleString()}`);
      });
    }

    console.log('\n' + '=' .repeat(80));
    console.log('✅ Dashboard will show:', followUpsDueCount, 'follow-ups today');
    console.log('=' .repeat(80));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTodayFollowUpsFix();
