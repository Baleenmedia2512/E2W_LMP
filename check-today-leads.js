const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTodayLeads() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const leads = await prisma.lead.findMany({
      where: {
        source: 'meta',
        createdAt: {
          gte: today
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });
    
    console.log(`\n📊 Today's Meta Leads: ${leads.length}`);
    console.log('=====================================\n');
    
    if (leads.length === 0) {
      console.log('❌ No Meta leads found today!\n');
    } else {
      leads.forEach((lead, i) => {
        console.log(`${i + 1}. ${lead.name} (${lead.phone})`);
        console.log(`   Created: ${lead.createdAt}`);
        console.log(`   Status: ${lead.status}`);
        if (lead.metadata) {
          try {
            const meta = typeof lead.metadata === 'string' ? JSON.parse(lead.metadata) : lead.metadata;
            console.log(`   Meta Lead ID: ${meta.metaLeadId || 'N/A'}`);
          } catch (e) {}
        }
        console.log('');
      });
    }
    
    // Also check all-time Meta leads count
    const totalMetaLeads = await prisma.lead.count({
      where: { source: 'meta' }
    });
    console.log(`\n📈 Total Meta leads in DB: ${totalMetaLeads}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTodayLeads();
