const { PrismaClient } = require('@prisma/client');

// Force the direct URL
process.env.DATABASE_URL = 'postgresql://postgres:Easy2work%4025@db.wkwrrdcjknvupwsfdjtd.supabase.co:5432/postgres';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function test() {
  try {
    console.log('Testing with URL:', process.env.DATABASE_URL.replace(/:[^@]+@/, ':***@'));
    const result = await prisma.$queryRaw`SELECT 1 as test, current_database() as db`;
    console.log('✓ Connection SUCCESS!');
    console.log('Result:', result);
    
    const userCount = await prisma.user.count();
    console.log(`✓ Found ${userCount} users`);
  } catch (error) {
    console.error('✗ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
