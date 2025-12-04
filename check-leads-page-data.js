const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLeadsPageData() {
  try {
    console.log('🔍 Checking what Leads Page fetches...\n');
    console.log('=' .repeat(80));

    // Simulate what /api/leads?limit=100 returns
    const leadsResponse = await prisma.lead.findMany({
      where: {},
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 100,
    });

    console.log(`📋 Leads fetched (limit 100): ${leadsResponse.length}`);
    
    // Filter active leads (same as categorization logic)
    const activeLeads = leadsResponse.filter(lead => 
      ['new', 'followup', 'qualified'].includes(lead.status)
    );
    
    console.log(`✅ Active leads: ${activeLeads.length}`);
    console.log('=' .repeat(80));

    // Simulate what /api/followups?limit=100 returns
    const followUpsResponse = await prisma.followUp.findMany({
      where: {},
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 100,
    });

    console.log(`\n📅 Follow-ups fetched (limit 100): ${followUpsResponse.length}`);
    console.log('=' .repeat(80));

    // Filter follow-ups for active leads only
    const activeLeadIds = new Set(activeLeads.map(l => l.id));
    const followUpsForActiveLeads = followUpsResponse.filter(f => 
      activeLeadIds.has(f.leadId)
    );

    console.log(`\n✅ Follow-ups for active leads: ${followUpsForActiveLeads.length}`);
    console.log('=' .repeat(80));

    // Now categorize like the leads page does
    const now = new Date();
    const leadNextFollowUpMap = new Map();

    // Find NEXT (earliest) follow-up per lead
    for (const followUp of followUpsForActiveLeads) {
      const existing = leadNextFollowUpMap.get(followUp.leadId);
      const followUpDate = new Date(followUp.scheduledAt);
      
      if (!existing || followUpDate < new Date(existing.scheduledAt)) {
        leadNextFollowUpMap.set(followUp.leadId, followUp);
      }
    }

    // Count overdue
    let overdueCount = 0;
    const overdueDetails = [];

    for (const [leadId, followUp] of leadNextFollowUpMap.entries()) {
      const scheduledDate = new Date(followUp.scheduledAt);
      if (scheduledDate < now) {
        overdueCount++;
        const lead = activeLeads.find(l => l.id === leadId);
        if (lead) {
          overdueDetails.push({
            name: lead.name,
            scheduledAt: followUp.scheduledAt,
            leadId: leadId
          });
        }
      }
    }

    console.log(`\n🔴 OVERDUE count on Leads Page: ${overdueCount}`);
    console.log('=' .repeat(80));

    if (overdueDetails.length > 0) {
      console.log('\nOverdue leads shown on Leads Page:');
      overdueDetails.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - ${new Date(item.scheduledAt).toLocaleString()}`);
      });
    }

    console.log('\n' + '=' .repeat(80));
    console.log('\n📊 SUMMARY:');
    console.log(`   Total leads fetched: ${leadsResponse.length}`);
    console.log(`   Active leads: ${activeLeads.length}`);
    console.log(`   Follow-ups fetched: ${followUpsResponse.length}`);
    console.log(`   Follow-ups for active leads: ${followUpsForActiveLeads.length}`);
    console.log(`   Overdue leads on page: ${overdueCount}`);
    console.log('=' .repeat(80));

    // Check if there are follow-ups NOT being fetched
    const allFollowUps = await prisma.followUp.findMany({
      where: {
        lead: {
          status: {
            in: ['new', 'followup', 'qualified']
          }
        }
      }
    });

    console.log(`\n⚠️  Total follow-ups in DB for active leads: ${allFollowUps.length}`);
    console.log(`   Follow-ups fetched by page: ${followUpsForActiveLeads.length}`);
    console.log(`   Missing follow-ups: ${allFollowUps.length - followUpsForActiveLeads.length}`);
    console.log('=' .repeat(80));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLeadsPageData();
