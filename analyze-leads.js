const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeLeads() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const allToday = await prisma.lead.findMany({
      where: {
        source: 'meta',
        createdAt: { gte: today }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    let webhookLeads = 0;
    let manualLeads = 0;
    
    allToday.forEach(lead => {
      if (lead.metadata) {
        try {
          const meta = typeof lead.metadata === 'string' ? JSON.parse(lead.metadata) : lead.metadata;
          if (meta.metaLeadId && meta.metaLeadId.startsWith('manual_')) {
            manualLeads++;
          } else {
            webhookLeads++;
            console.log(`\n✅ Real webhook lead found:`);
            console.log(`   Name: ${lead.name}`);
            console.log(`   Phone: ${lead.phone}`);
            console.log(`   Meta Lead ID: ${meta.metaLeadId}`);
            console.log(`   Created: ${lead.createdAt}`);
          }
        } catch (e) {}
      }
    });
    
    console.log(`\n📊 Today's Meta Leads Analysis:`);
    console.log(`   Total: ${allToday.length}`);
    console.log(`   Real Webhook Leads: ${webhookLeads}`);
    console.log(`   Manual/Backfill Leads: ${manualLeads}`);
    
    if (webhookLeads === 0) {
      console.log(`\n⚠️ WARNING: No real webhook leads received today!`);
      console.log(`   This means Meta webhook is NOT sending data to your app.\n`);
      console.log(`Possible reasons:`);
      console.log(`   1. Webhook not subscribed in Meta Business Manager`);
      console.log(`   2. Webhook URL incorrect in Meta settings`);
      console.log(`   3. No actual form submissions today from Meta ads`);
      console.log(`   4. Webhook endpoint is rejecting requests\n`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeLeads();
