// Test alternative Supabase pooler connection formats
const { PrismaClient } = require('@prisma/client');

const password = 'Easy2work%4025';
const projectRef = 'wkwrrdcjknvupwsfdjtd';

const formats = [
  {
    name: 'Format 1: Standard pooler (current)',
    url: `postgresql://postgres:${password}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
  },
  {
    name: 'Format 2: With project ref in username',
    url: `postgresql://postgres.${projectRef}:${password}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`
  },
  {
    name: 'Format 3: Transaction mode parameter',
    url: `postgresql://postgres:${password}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&pool_mode=transaction`
  },
  {
    name: 'Format 4: IPv4 connection pooler',
    url: `postgresql://postgres:${password}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?pgbouncer=true`
  },
  {
    name: 'Format 5: Session mode',
    url: `postgresql://postgres:${password}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&pool_mode=session`
  },
  {
    name: 'Format 6: Pooler with sslmode',
    url: `postgresql://postgres:${password}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require`
  }
];

async function testConnection(name, url) {
  const prisma = new PrismaClient({
    datasources: { db: { url } },
    log: ['error']
  });

  try {
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log(`✓ ${name}: SUCCESS`);
    await prisma.$disconnect();
    return url;
  } catch (error) {
    const errorMsg = error.message.split('\n')[0];
    console.log(`✗ ${name}: ${errorMsg}`);
    await prisma.$disconnect();
    return null;
  }
}

async function runTests() {
  console.log('\n=== Testing Supabase Pooler Connection Formats ===\n');
  
  for (const format of formats) {
    const workingUrl = await testConnection(format.name, format.url);
    if (workingUrl) {
      console.log('\n' + '='.repeat(60));
      console.log('✓ WORKING CONNECTION FOUND!');
      console.log('='.repeat(60));
      console.log('\nUse this for Vercel production:');
      console.log(workingUrl);
      console.log('\nRun this command to update Vercel:');
      console.log(`vercel env rm DATABASE_URL production --yes`);
      console.log(`echo "${workingUrl}" | vercel env add DATABASE_URL production`);
      console.log(`vercel --prod --yes`);
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✗ No working pooler connection found');
  console.log('='.repeat(60));
  console.log('\nPlease check Supabase dashboard:');
  console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/settings/database');
  console.log('2. Find "Connection Pooling" section');
  console.log('3. Enable it if disabled');
  console.log('4. Copy the exact connection string shown there');
}

runTests().catch(console.error);
