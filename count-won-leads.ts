import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function countWonLeads() {
  try {
    console.log('Connecting to database...');
    
    // Count leads with "won" status
    const wonLeadsCount = await prisma.lead.count({
      where: {
        status: 'won'
      }
    });
    
    console.log(`\n✅ Total leads with "won" status: ${wonLeadsCount}`);
    
    // Get some additional stats
    const totalLeads = await prisma.lead.count();
    const percentage = totalLeads > 0 ? ((wonLeadsCount / totalLeads) * 100).toFixed(2) : 0;
    
    console.log(`📊 Total leads in database: ${totalLeads}`);
    console.log(`📈 Won leads percentage: ${percentage}%`);
    
    // Get breakdown by source if there are won leads
    if (wonLeadsCount > 0) {
      const wonBySource = await prisma.lead.groupBy({
        by: ['source'],
        where: {
          status: 'won'
        },
        _count: {
          id: true
        }
      });
      
      console.log('\n📋 Won leads by source:');
      wonBySource.forEach(item => {
        console.log(`  - ${item.source}: ${item._count.id}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

countWonLeads();
