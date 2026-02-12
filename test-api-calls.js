const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCallsAPI() {
  try {
    console.log('🔍 Testing Calls API Data...\n');
    
    // Simulate what the API does
    const callLogs = await prisma.callLog.findMany({
      where: {},
      include: {
        Lead: { select: { id: true, name: true, phone: true } },
        User: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    console.log(`Found ${callLogs.length} calls\n`);
    
    callLogs.forEach((log, index) => {
      console.log(`Call ${index + 1}:`);
      console.log(`  Lead: ${log.Lead.name}`);
      console.log(`  Has recordingUrl field: ${log.hasOwnProperty('recordingUrl')}`);
      console.log(`  recordingUrl value: ${log.recordingUrl || 'NULL'}`);
      console.log(`  Has recordingStatus field: ${log.hasOwnProperty('recordingStatus')}`);
      console.log(`  recordingStatus value: ${log.recordingStatus || 'NULL'}`);
      console.log('');
    });

    // Now test the formatted version (what API returns)
    console.log('📤 After API Formatting:\n');
    const formattedCallLogs = callLogs.map((log) => ({
      ...log,
      lead: log.Lead,
      caller: log.User,
      Lead: undefined,
      User: undefined,
    }));

    formattedCallLogs.forEach((log, index) => {
      console.log(`Call ${index + 1} (formatted):`);
      console.log(`  Has recordingUrl: ${log.hasOwnProperty('recordingUrl')}`);
      console.log(`  recordingUrl: ${log.recordingUrl || 'NULL'}`);
      console.log(`  Has recordingStatus: ${log.hasOwnProperty('recordingStatus')}`);
      console.log(`  recordingStatus: ${log.recordingStatus || 'NULL'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCallsAPI();
