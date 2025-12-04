const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMissingLeads() {
  try {
    console.log('🔍 Checking missing overdue leads...\n');
    console.log('=' .repeat(80));

    const missingLeadNames = ['ram khan', 'ADIYA', 'ramesh test', 'Rajendran'];
    const showingLeadNames = ['lodha', 'Query', 'சக சக்கரைபான்டி', 'kiruba broooooooo', 'Dhilip Prabakaran'];

    console.log('✅ Showing on page (5 leads):');
    for (const name of showingLeadNames) {
      const lead = await prisma.lead.findFirst({
        where: {
          name: {
            contains: name
          }
        },
        include: {
          followUps: {
            orderBy: { scheduledAt: 'asc' }
          }
        }
      });
      
      if (lead) {
        console.log(`\n${lead.name}:`);
        console.log(`  Status: ${lead.status}`);
        console.log(`  Created: ${lead.createdAt}`);
        console.log(`  Follow-ups: ${lead.followUps.length}`);
        if (lead.followUps.length > 0) {
          const nextFollowUp = lead.followUps[0];
          console.log(`  Next follow-up: ${nextFollowUp.scheduledAt}`);
        }
      }
    }

    console.log('\n' + '=' .repeat(80));
    console.log('\n❌ Missing from page (4 leads):');
    
    for (const name of missingLeadNames) {
      const lead = await prisma.lead.findFirst({
        where: {
          name: {
            contains: name
          }
        },
        include: {
          followUps: {
            orderBy: { scheduledAt: 'asc' }
          }
        }
      });
      
      if (lead) {
        console.log(`\n${lead.name}:`);
        console.log(`  Status: ${lead.status}`);
        console.log(`  Created: ${lead.createdAt}`);
        console.log(`  Follow-ups: ${lead.followUps.length}`);
        if (lead.followUps.length > 0) {
          const nextFollowUp = lead.followUps[0];
          console.log(`  Next follow-up: ${nextFollowUp.scheduledAt}`);
        }
        
        // Check if this lead would be in the first 100 leads
        const position = await prisma.lead.count({
          where: {
            createdAt: {
              gt: lead.createdAt
            }
          }
        });
        console.log(`  ⚠️ Position in leads list: ${position + 1}`);
      }
    }

    console.log('\n' + '=' .repeat(80));
    
    // Check orderBy createdAt desc - which leads come first
    console.log('\n📊 Recent leads (by createdAt desc):');
    const recentLeads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        name: true,
        createdAt: true,
        status: true
      }
    });

    const allNineNames = [...showingLeadNames, ...missingLeadNames];
    const positions = [];
    
    recentLeads.forEach((lead, index) => {
      const isOneOfNine = allNineNames.some(name => 
        lead.name.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(lead.name.toLowerCase())
      );
      
      if (isOneOfNine) {
        positions.push({
          position: index + 1,
          name: lead.name,
          createdAt: lead.createdAt,
          status: lead.status,
          showing: showingLeadNames.some(n => 
            lead.name.toLowerCase().includes(n.toLowerCase()) || 
            n.toLowerCase().includes(lead.name.toLowerCase())
          )
        });
      }
    });

    console.log('\nPosition of all 9 overdue leads in fetch order:');
    positions.forEach(p => {
      console.log(`  ${p.position}. ${p.name} - ${p.status} - ${p.showing ? '✅ SHOWING' : '❌ MISSING'}`);
    });

    console.log('\n' + '=' .repeat(80));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMissingLeads();
