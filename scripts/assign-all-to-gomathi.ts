import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function assignAllLeadsToGomathi() {
  try {
    console.log('🔍 Finding Gomathi user...');
    
    // Find Gomathi
    const gomathi = await prisma.user.findUnique({
      where: { email: 'gomathi@baleenmedia.com' },
      select: { id: true, name: true, isActive: true },
    });

    if (!gomathi) {
      console.error('❌ Gomathi user not found!');
      console.log('💡 Please ensure a user with email "gomathi@baleenmedia.com" exists in the database.');
      process.exit(1);
    }

    if (!gomathi.isActive) {
      console.warn('⚠️ Gomathi user is inactive. Activating...');
      await prisma.user.update({
        where: { email: 'gomathi@baleenmedia.com' },
        data: { isActive: true },
      });
      console.log('✅ Gomathi user activated');
    }

    console.log(`✅ Found Gomathi: ${gomathi.name} (ID: ${gomathi.id})`);

    // Count total leads
    const totalLeads = await prisma.lead.count();
    console.log(`\n📊 Total leads in database: ${totalLeads}`);

    // Count leads already assigned to Gomathi
    const alreadyAssigned = await prisma.lead.count({
      where: { assignedToId: gomathi.id },
    });
    console.log(`📊 Leads already assigned to Gomathi: ${alreadyAssigned}`);

    // Count leads that need to be reassigned
    const needsReassignment = totalLeads - alreadyAssigned;
    console.log(`📊 Leads to be reassigned: ${needsReassignment}`);

    if (needsReassignment === 0) {
      console.log('\n✅ All leads are already assigned to Gomathi!');
      process.exit(0);
    }

    // Confirm before proceeding
    console.log('\n🔄 Starting reassignment...');

    // Update all leads to be assigned to Gomathi
    const result = await prisma.lead.updateMany({
      where: {
        assignedToId: { not: gomathi.id },
      },
      data: {
        assignedToId: gomathi.id,
      },
    });

    console.log(`\n✅ Successfully assigned ${result.count} leads to Gomathi!`);

    // Log activity for updated leads (sample for first 100)
    const updatedLeads = await prisma.lead.findMany({
      where: { assignedToId: gomathi.id },
      select: { id: true, name: true },
      take: 100,
    });

    console.log('\n📝 Logging activity history...');
    for (const lead of updatedLeads) {
      await prisma.activityHistory.create({
        data: {
          leadId: lead.id,
          userId: gomathi.id,
          action: 'assigned',
          description: `Lead reassigned to Gomathi (bulk assignment)`,
          fieldName: 'assignedToId',
          newValue: gomathi.id,
        },
      });
    }

    console.log(`✅ Activity logged for ${updatedLeads.length} leads`);

    // Final summary
    const finalCount = await prisma.lead.count({
      where: { assignedToId: gomathi.id },
    });

    console.log('\n📊 Final Summary:');
    console.log(`   Total leads: ${totalLeads}`);
    console.log(`   Assigned to Gomathi: ${finalCount}`);
    console.log('\n✅ All done!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

assignAllLeadsToGomathi();
