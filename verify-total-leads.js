const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyTotalLeadsCalculation() {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    console.log('✅ Verifying Total Leads Calculation\n');
    console.log('Formula: Total Leads = New Leads + Overdue + Today Follow-ups + Won');
    console.log('=' .repeat(80));

    // 1. New Leads Today
    const newLeadsCount = await prisma.lead.count({
      where: {
        status: 'new',
        createdAt: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    });

    // 2. Won Leads Today
    const wonLeadsCount = await prisma.lead.count({
      where: {
        status: 'won',
        updatedAt: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    });

    console.log(`\n📊 Component Counts:`);
    console.log(`   New Leads Today: ${newLeadsCount}`);
    console.log(`   Won Leads Today: ${wonLeadsCount}`);

    // 2. Get all follow-ups for active leads
    const allFollowUps = await prisma.followUp.findMany({
      where: {
        lead: {
          status: {
            in: ['new', 'followup', 'qualified']
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

    // Count Overdue
    let overdueCount = 0;
    for (const followUp of leadFollowUpMap.values()) {
      const scheduledDate = new Date(followUp.scheduledAt);
      if (scheduledDate < now) {
        overdueCount++;
      }
    }

    console.log(`   Overdue Follow-ups: ${overdueCount}`);

    // Count Today Follow-ups (future time only)
    let followUpsDueCount = 0;
    for (const followUp of leadFollowUpMap.values()) {
      const scheduledDate = new Date(followUp.scheduledAt);
      if (scheduledDate >= now && scheduledDate >= todayStart && scheduledDate <= todayEnd) {
        followUpsDueCount++;
      }
    }

    console.log(`   Today Follow-ups: ${followUpsDueCount}`);

    // Calculate Total
    const totalLeadsForDashboard = newLeadsCount + overdueCount + followUpsDueCount + wonLeadsCount;

    console.log('\n' + '=' .repeat(80));
    console.log(`\n🎯 TOTAL LEADS = ${newLeadsCount} + ${overdueCount} + ${followUpsDueCount} + ${wonLeadsCount} = ${totalLeadsForDashboard}`);
    console.log('=' .repeat(80));
    
    console.log('\n✅ This total will be displayed on the dashboard!');
    console.log('   - Represents leads requiring immediate attention + won deals');
    console.log('   - Sum of: New arrivals + Overdue + Today\'s follow-ups + Won leads\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyTotalLeadsCalculation();
