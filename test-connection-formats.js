// Test different connection string formats
const { PrismaClient } = require('@prisma/client');

const password = 'Easy2work@25';
const encodedPassword1 = 'Easy2work%4025'; // Current encoding
const encodedPassword2 = encodeURIComponent(password); // JavaScript encoding

console.log('Password encoding comparison:');
console.log('Original:', password);
console.log('Current encoding:', encodedPassword1);
console.log('JS encodeURIComponent:', encodedPassword2);
console.log('\n' + '='.repeat(60) + '\n');

const connectionStrings = [
  {
    name: 'Current pooler connection',
    url: `postgresql://postgres:${encodedPassword1}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`
  },
  {
    name: 'Pooler without pgbouncer param',
    url: `postgresql://postgres:${encodedPassword1}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?connection_limit=1`
  },
  {
    name: 'Pooler with different encoding',
    url: `postgresql://postgres:${encodedPassword2}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`
  },
  {
    name: 'Direct connection (bypass pooler)',
    url: `postgresql://postgres:${encodedPassword1}@db.wkwrrdcjknvupwsfdjtd.supabase.co:5432/postgres`
  },
  {
    name: 'Direct with different encoding',
    url: `postgresql://postgres:${encodedPassword2}@db.wkwrrdcjknvupwsfdjtd.supabase.co:5432/postgres`
  }
];

async function testConnection(name, url) {
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    },
    log: ['error']
  });

  try {
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log(`✓ ${name}: SUCCESS`);
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.log(`✗ ${name}: ${error.message.split('\n')[0]}`);
    await prisma.$disconnect();
    return false;
  }
}

async function runTests() {
  console.log('Testing different connection formats...\n');
  
  for (const config of connectionStrings) {
    const success = await testConnection(config.name, config.url);
    if (success) {
      console.log('\n' + '='.repeat(60));
      console.log('WORKING CONNECTION FOUND!');
      console.log('Use this format in your .env files');
      console.log('='.repeat(60));
      break;
    }
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

runTests().catch(console.error);
