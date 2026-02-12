const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCallRecordings() {
  try {
    console.log('🔍 Checking call_recordings table...\n');
    
    // Check structure
    const structure = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'call_recordings'
      ORDER BY ordinal_position
    `;
    
    console.log('Table Structure:');
    console.log(structure);
    console.log('');
    
    // Get sample data
    const recordings = await prisma.$queryRaw`
      SELECT * FROM call_recordings 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    console.log('Sample Recordings:');
    recordings.forEach((rec, i) => {
      console.log(`\nRecording ${i + 1}:`);
      console.log(JSON.stringify(rec, null, 2));
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCallRecordings();
