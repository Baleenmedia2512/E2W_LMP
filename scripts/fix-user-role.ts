import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixUserRole() {
  try {
    // Find SuperAgent role
    const superAgentRole = await prisma.role.findUnique({
      where: { name: 'SuperAgent' },
    });

    if (!superAgentRole) {
      console.error('❌ SuperAgent role not found in database');
      process.exit(1);
    }

    // Update user rameshbalapr3@gmail.com to SuperAgent
    const user = await prisma.user.update({
      where: { email: 'rameshbalapr3@gmail.com' },
      data: {
        roleId: superAgentRole.id,
      },
      include: {
        role: true,
      },
    });

    console.log('✅ Successfully updated user role:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role.name}`);
    console.log('\n🎉 Please sign out and sign back in to see the changes!');
  } catch (error) {
    console.error('❌ Error updating user role:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserRole();
