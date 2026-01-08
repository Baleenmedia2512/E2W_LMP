/**
 * Quick verification script to test Supabase connection
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  try {
    console.log('🔍 Verifying Supabase PostgreSQL connection...\n');

    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected successfully\n');

    // Count records
    const [roleCount, userCount, leadCount] = await Promise.all([
      prisma.role.count(),
      prisma.user.count(),
      prisma.lead.count(),
    ]);

    console.log('📊 Database Summary:');
    console.log(`   Roles: ${roleCount}`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Leads: ${leadCount}\n`);

    // Test JSON query (PostgreSQL syntax)
    const metaLeads = await prisma.lead.count({
      where: { source: 'meta' }
    });
    console.log(`   Meta Leads: ${metaLeads}`);

    // Test latest lead
    const latestLead = await prisma.lead.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        source: true,
        createdAt: true,
      }
    });

    if (latestLead) {
      console.log('\n📌 Latest Lead:');
      console.log(`   Name: ${latestLead.name}`);
      console.log(`   Phone: ${latestLead.phone}`);
      console.log(`   Source: ${latestLead.source}`);
      console.log(`   Created: ${latestLead.createdAt}`);
    }

    console.log('\n✅ Verification complete! Your Supabase database is working correctly.');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verify()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
