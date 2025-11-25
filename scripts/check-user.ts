import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'rameshbalapr3@gmail.com' },
      include: {
        role: true,
      },
    });

    if (!user) {
      console.error('❌ User not found');
      process.exit(1);
    }

    console.log('=== USER DETAILS ===');
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name}`);
    console.log(`Role: ${user.role.name}`);
    console.log(`Role ID: ${user.roleId}`);
    console.log(`Active: ${user.isActive}`);
    console.log('\n=== ALL SESSIONS ===');
    
    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
    });
    
    console.log(`Total active sessions: ${sessions.length}`);
    sessions.forEach((session, index) => {
      console.log(`\nSession ${index + 1}:`);
      console.log(`  Token: ${session.sessionToken.substring(0, 20)}...`);
      console.log(`  Expires: ${session.expires}`);
    });

    // Delete all sessions to force re-login
    console.log('\n🔄 Deleting all sessions to force fresh login...');
    const deleted = await prisma.session.deleteMany({
      where: { userId: user.id },
    });
    
    console.log(`✅ Deleted ${deleted.count} session(s)`);
    console.log('\n🎉 Now refresh your browser - you will be logged out automatically!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
