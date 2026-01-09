// Test database connection
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    console.log('DIRECT_DATABASE_URL:', process.env.DIRECT_DATABASE_URL ? 'SET' : 'NOT SET');
    
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✓ Connection successful!', result);
    
    // Try to count users
    const userCount = await prisma.user.count();
    console.log(`✓ Found ${userCount} users in database`);
    
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
