const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findRecordings() {
  try {
    console.log('🔍 Searching for recordings in database...\n');
    
    // Check all tables that might have recordings
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%record%' OR table_name LIKE '%call%'
    `;
    
    console.log('Tables with "record" or "call" in name:');
    console.log(tables);
    console.log('');
    
    // Check if any CallLog has non-null recordingUrl
    const callsWithRecordings = await prisma.callLog.count({
      where: {
        recordingUrl: { not: null }
      }
    });
    
    console.log(`CallLog records with recordingUrl: ${callsWithRecordings}`);
    
    // Check total calls
    const totalCalls = await prisma.callLog.count();
    console.log(`Total CallLog records: ${totalCalls}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findRecordings();
