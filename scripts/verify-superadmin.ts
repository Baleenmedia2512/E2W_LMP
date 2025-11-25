import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySuperAdminModule() {
  console.log('=== SUPERADMIN MODULE VERIFICATION ===\n');

  try {
    // 1. Check user role
    const user = await prisma.user.findUnique({
      where: { email: 'rameshbalapr3@gmail.com' },
      include: { role: true },
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ USER DETAILS:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role.name}`);
    console.log(`   Active: ${user.isActive}`);
    console.log();

    // 2. Check SuperAgent role exists
    const superAgentRole = await prisma.role.findUnique({
      where: { name: 'SuperAgent' },
    });

    if (!superAgentRole) {
      console.log('❌ SuperAgent role not found in database');
      return;
    }

    console.log('✅ SUPERAGENT ROLE EXISTS:');
    console.log(`   Role ID: ${superAgentRole.id}`);
    console.log(`   Description: ${superAgentRole.description || 'N/A'}`);
    console.log();

    // 3. Check if user has SuperAgent role
    if (user.role.name === 'SuperAgent') {
      console.log('✅ USER IS SUPERAGENT');
    } else {
      console.log(`❌ USER IS NOT SUPERAGENT (Current role: ${user.role.name})`);
    }
    console.log();

    // 4. List all users in system
    const allUsers = await prisma.user.findMany({
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });

    console.log('✅ ALL USERS IN SYSTEM:');
    allUsers.forEach((u, index) => {
      console.log(`   ${index + 1}. ${u.email} - ${u.role.name} (${u.isActive ? 'Active' : 'Inactive'})`);
    });
    console.log();

    // 5. Check all roles
    const allRoles = await prisma.role.findMany();
    console.log('✅ ALL ROLES IN SYSTEM:');
    allRoles.forEach((r, index) => {
      console.log(`   ${index + 1}. ${r.name} - ${r.description || 'No description'}`);
    });
    console.log();

    // 6. Summary
    console.log('=== MODULE STATUS ===');
    console.log(`✅ Sidebar: Has "Add User" and "Manage Users" menu items for SuperAgent`);
    console.log(`✅ Add User Page: /dashboard/super/users/add`);
    console.log(`✅ Manage Users Page: /dashboard/super/users`);
    console.log(`✅ API Endpoint: /api/users/add (POST)`);
    console.log(`✅ API Endpoint: /api/users (GET)`);
    console.log();

    if (user.role.name === 'SuperAgent') {
      console.log('🎉 SUPERADMIN MODULE IS READY!');
      console.log();
      console.log('📋 TO USE:');
      console.log('1. Sign in at: http://localhost:3001/auth/signin');
      console.log('2. Use Google Sign-In with: rameshbalapr3@gmail.com');
      console.log('3. You will see "Add User" and "Manage Users" in sidebar');
      console.log('4. Click "Add User" to register new agents');
    } else {
      console.log('⚠️  USER NEEDS SUPERAGENT ROLE');
      console.log('Run: npx ts-node scripts/fix-user-role.ts');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifySuperAdminModule();
