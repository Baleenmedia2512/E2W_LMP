import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get SuperAgent role
  const superAgentRole = await prisma.role.findUnique({
    where: { name: 'SuperAgent' },
  });

  if (!superAgentRole) {
    console.error('❌ SuperAgent role not found!');
    process.exit(1);
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: 'rameshbalapr3@gmail.com' },
  });

  if (existingUser) {
    console.log('✅ User already exists:', existingUser.email);
    return;
  }

  // Create new user
  const newUser = await prisma.user.create({
    data: {
      email: 'rameshbalapr3@gmail.com',
      name: 'Ramesh Bala P.R',
      roleId: superAgentRole.id,
      isActive: true,
    },
  });

  console.log('✅ Successfully added user:');
  console.log('   Email:', newUser.email);
  console.log('   Name:', newUser.name);
  console.log('   Role: SuperAgent');
  console.log('   ID:', newUser.id);
  console.log('\n🎉 You can now sign in with Google using this email!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
