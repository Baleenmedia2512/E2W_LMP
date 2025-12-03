import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAndAssignAll() {
  try {
    console.log('🔍 Finding Gomathi user...');
    
    // Find Gomathi
    const gomathi = await prisma.user.findUnique({
      where: { email: 'gomathi@baleenmedia.com' },
      select: { id: true, name: true, isActive: true },
    });

    if (!gomathi) {
      console.error('❌ Gomathi user not found!');
      process.exit(1);
    }

    console.log(`✅ Found Gomathi: ${gomathi.name} (ID: ${gomathi.id})\n`);

    // Get all leads with their current assignments
    const allLeads = await prisma.lead.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        source: true,
        assignedToId: true,
        assignedTo: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`📊 Total leads: ${allLeads.length}\n`);

    // Group by assignment
    const unassigned = allLeads.filter(l => !l.assignedToId);
    const assignedToGomathi = allLeads.filter(l => l.assignedToId === gomathi.id);
    const assignedToOthers = allLeads.filter(l => l.assignedToId && l.assignedToId !== gomathi.id);

    console.log(`✅ Assigned to Gomathi: ${assignedToGomathi.length}`);
    console.log(`❌ Unassigned: ${unassigned.length}`);
    console.log(`👥 Assigned to others: ${assignedToOthers.length}\n`);

    if (assignedToOthers.length > 0) {
      console.log('👥 Leads assigned to other users:');
      assignedToOthers.forEach(lead => {
        console.log(`   - ${lead.name} (${lead.source}) → ${lead.assignedTo?.name || 'Unknown'}`);
      });
      console.log('');
    }

    if (unassigned.length > 0) {
      console.log('❌ Unassigned leads:');
      unassigned.slice(0, 10).forEach(lead => {
        console.log(`   - ${lead.name} (${lead.source})`);
      });
      if (unassigned.length > 10) {
        console.log(`   ... and ${unassigned.length - 10} more`);
      }
      console.log('');
    }

    // Now assign ALL leads to Gomathi (regardless of current assignment)
    const leadsToUpdate = allLeads.filter(l => l.assignedToId !== gomathi.id);
    
    if (leadsToUpdate.length === 0) {
      console.log('✅ All leads are already assigned to Gomathi!');
      process.exit(0);
    }

    console.log(`🔄 Assigning ${leadsToUpdate.length} leads to Gomathi...\n`);

    // Update all leads
    const result = await prisma.lead.updateMany({
      where: {
        OR: [
          { assignedToId: null },
          { assignedToId: { not: gomathi.id } },
        ],
      },
      data: {
        assignedToId: gomathi.id,
      },
    });

    console.log(`✅ Successfully updated ${result.count} leads!`);

    // Verify final count
    const finalCount = await prisma.lead.count({
      where: { assignedToId: gomathi.id },
    });

    console.log(`\n📊 Final Result:`);
    console.log(`   Total leads: ${allLeads.length}`);
    console.log(`   Assigned to Gomathi: ${finalCount}`);
    console.log(`   Success rate: ${((finalCount / allLeads.length) * 100).toFixed(1)}%`);

    if (finalCount === allLeads.length) {
      console.log('\n🎉 All leads are now assigned to Gomathi!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndAssignAll();
