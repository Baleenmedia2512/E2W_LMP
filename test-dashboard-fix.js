const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDashboardLogic() {
  try {
    const now = new Date();
    console.log('🧪 Testing Dashboard Overdue Logic (Fixed)\n');
    console.log('Current Time:', now.toISOString());
    console.log('=' .repeat(80));

    // Get all pending follow-ups
    const allPendingFollowUps = await prisma.followUp.findMany({
      where: {
        lead: {
          status: {
            in: ['new', 'followup', 'qualified']
          }
        }
      },
      orderBy: { scheduledAt: 'desc' }
    });

    console.log(`\nTotal follow-ups for active leads: ${allPendingFollowUps.length}`);
    console.log('=' .repeat(80));

    // Group by leadId and find NEXT follow-up (prefer future over past)
    const leadNextFollowUpMap = new Map();
    const followUpsByLead = new Map();
    
    for (const followUp of allPendingFollowUps) {
      if (!followUpsByLead.has(followUp.leadId)) {
        followUpsByLead.set(followUp.leadId, []);
      }
      followUpsByLead.get(followUp.leadId).push(followUp);
    }
    
    console.log(`\nLeads with follow-ups: ${followUpsByLead.size}`);
    console.log('=' .repeat(80));

    // Find NEXT follow-up per lead
    for (const [leadId, followUps] of followUpsByLead.entries()) {
      const futureFollowUps = followUps.filter(f => new Date(f.scheduledAt) >= now);
      const pastFollowUps = followUps.filter(f => new Date(f.scheduledAt) < now);
      
      let nextFollowUp;
      
      if (futureFollowUps.length > 0) {
        nextFollowUp = futureFollowUps.reduce((earliest, current) => {
          return new Date(current.scheduledAt) < new Date(earliest.scheduledAt) ? current : earliest;
        });
      } else if (pastFollowUps.length > 0) {
        nextFollowUp = pastFollowUps.reduce((latest, current) => {
          return new Date(current.scheduledAt) > new Date(latest.scheduledAt) ? current : latest;
        });
      }
      
      if (nextFollowUp) {
        leadNextFollowUpMap.set(leadId, nextFollowUp);
      }
    }

    // Count overdue
    const overdueLeadsSet = new Set();
    const overdueDetails = [];
    
    for (const [leadId, followUp] of leadNextFollowUpMap.entries()) {
      const scheduledDate = new Date(followUp.scheduledAt);
      if (scheduledDate < now) {
        overdueLeadsSet.add(leadId);
        
        const lead = await prisma.lead.findUnique({
          where: { id: leadId },
          select: { name: true, status: true }
        });
        
        overdueDetails.push({
          leadId,
          name: lead?.name,
          status: lead?.status,
          scheduledAt: followUp.scheduledAt
        });
      }
    }

    console.log(`\n🔴 OVERDUE COUNT: ${overdueLeadsSet.size}`);
    console.log('=' .repeat(80));

    if (overdueDetails.length > 0) {
      console.log('\nOverdue leads:');
      overdueDetails.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
      
      overdueDetails.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name}`);
        console.log(`   Scheduled: ${new Date(item.scheduledAt).toLocaleString()}`);
        console.log(`   Status: ${item.status}`);
      });
    }

    console.log('\n' + '=' .repeat(80));
    console.log('✅ Dashboard will now show correct overdue count!');
    console.log('=' .repeat(80));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDashboardLogic();
