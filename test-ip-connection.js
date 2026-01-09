// Alternative: Try resolving the hostname and testing direct IP
const { PrismaClient } = require('@prisma/client');
const dns = require('dns').promises;

async function testWithIP() {
  console.log('\n=== Resolving Supabase database hostname ===\n');
  
  const hostname = 'db.wkwrrdcjknvupwsfdjtd.supabase.co';
  
  try {
    const addresses = await dns.resolve4(hostname);
    console.log(`✓ Resolved ${hostname} to:`, addresses);
    
    for (const ip of addresses) {
      console.log(`\nTesting connection to ${ip}:5432...`);
      
      const url = `postgresql://postgres:Easy2work%4025@${ip}:5432/postgres?sslmode=require`;
      const prisma = new PrismaClient({
        datasources: { db: { url } },
        log: ['error']
      });
      
      try {
        await prisma.$queryRaw`SELECT 1`;
        console.log(`✓ SUCCESS with IP ${ip}`);
        console.log('\nUse this URL for Vercel:');
        console.log(url);
        await prisma.$disconnect();
        return url;
      } catch (error) {
        console.log(`✗ Failed: ${error.message.split('\n')[0]}`);
        await prisma.$disconnect();
      }
    }
  } catch (error) {
    console.log(`✗ DNS resolution failed: ${error.message}`);
  }
  
  console.log('\n=== Alternative: Use Supabase connection pooling ===\n');
  console.log('Your Supabase project needs connection pooling enabled.');
  console.log('This is REQUIRED for Vercel/serverless environments.');
}

testWithIP().catch(console.error);
