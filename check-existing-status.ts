import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkExistingClientsStatus() {
  try {
    console.log('📊 Checking status distribution of existing clients...\n');

    const existingLeads = await prisma.lead.findMany({
      where: {
        is_existing: true,
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    console.log(`Total existing clients (is_existing = true): ${existingLeads.length}\n`);

    // Group by status
    const statusCounts: Record<string, number> = {};
    
    for (const lead of existingLeads) {
      statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
    }

    console.log('='.repeat(70));
    console.log('STATUS DISTRIBUTION OF EXISTING CLIENTS');
    console.log('='.repeat(70));
    
    Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
      const percentage = ((count / existingLeads.length) * 100).toFixed(1);
      console.log(`${status.toUpperCase().padEnd(15)} ${count.toString().padStart(4)} (${percentage}%)`);
    });

    console.log('='.repeat(70));

    // Count active vs outcome statuses
    const activeStatuses = ['new', 'followup', 'qualified'];
    const outcomeStatuses = ['won', 'lost', 'unreach', 'unqualified'];

    const activeCount = existingLeads.filter(lead => activeStatuses.includes(lead.status)).length;
    const outcomeCount = existingLeads.filter(lead => outcomeStatuses.includes(lead.status)).length;

    console.log('\n📋 SUMMARY:');
    console.log(`Active Leads (new, followup, qualified): ${activeCount}`);
    console.log(`Outcome Leads (won, lost, unreach, unqualified): ${outcomeCount}`);
    console.log(`\n💡 The leads categorization page shows "Active Leads" only.`);
    console.log(`   Leads with status won/lost/unreach/unqualified go to Outcomes page.`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkExistingClientsStatus();
