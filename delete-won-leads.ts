import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteWonLeads() {
  try {
    console.log('🔍 Checking won leads...');
    
    // Count leads with "won" status first
    const wonLeadsCount = await prisma.lead.count({
      where: {
        status: 'won'
      }
    });
    
    console.log(`\n⚠️  Found ${wonLeadsCount} leads with "won" status`);
    
    if (wonLeadsCount === 0) {
      console.log('✅ No won leads to delete');
      return;
    }
    
    console.log('\n🗑️  Deleting won leads...');
    
    // Delete all leads with won status
    // Cascade delete will handle related records (ActivityHistory, CallLog, FollowUp)
    const result = await prisma.lead.deleteMany({
      where: {
        status: 'won'
      }
    });
    
    console.log(`\n✅ Successfully deleted ${result.count} leads with "won" status`);
    
    // Show remaining counts
    const remainingLeads = await prisma.lead.count();
    console.log(`📊 Remaining leads in database: ${remainingLeads}`);
    
    // Show status breakdown
    const statusBreakdown = await prisma.lead.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });
    
    console.log('\n📋 Remaining leads by status:');
    statusBreakdown.forEach(item => {
      console.log(`  - ${item.status}: ${item._count.id}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteWonLeads();
