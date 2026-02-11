import prisma from './src/shared/lib/db/prisma';

async function checkCalls() {
  try {
    console.log('🔍 Checking call logs for Adithya...\n');
    
    // Get the specific lead from the screenshot
    const lead = await prisma.lead.findFirst({
      where: {
        OR: [
          { phone: { contains: '9766' } }, // From the screenshot URL
          { name: { contains: 'Adithya' } }
        ]
      },
      select: {
        id: true,
        name: true,
        phone: true
      }
    });

    if (!lead) {
      console.log('❌ Lead not found');
      return;
    }

    console.log('✅ Found lead:', lead.name);
    console.log('   Phone:', lead.phone);
    console.log('   ID:', lead.id);
    console.log('');

    // Get all call logs for this lead
    const calls = await prisma.callLog.findMany({
      where: { leadId: lead.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        startedAt: true,
        duration: true,
        callStatus: true,
        recordingUrl: true,
        recordingStatus: true,
        phoneDialed: true,
        createdAt: true
      }
    });

    console.log('📞 Call Logs:', calls.length, 'total\n');
    
    calls.forEach((call, index) => {
      console.log(`Call ${index + 1}:`);
      console.log(`  ID: ${call.id}`);
      console.log(`  Date: ${call.startedAt}`);
      console.log(`  Status: ${call.callStatus}`);
      console.log(`  Duration: ${call.duration || 0}s`);
      console.log(`  Recording URL: ${call.recordingUrl || '❌ NULL'}`);
      console.log(`  Recording Status: ${call.recordingStatus || 'N/A'}`);
      console.log('');
    });

    // Check if there are any recordings in Supabase for this phone
    const normalizedPhone = lead.phone.replace(/\D/g, '').slice(-10);
    console.log('\n📊 Summary:');
    console.log('─'.repeat(60));
    console.log('Normalized Phone:', normalizedPhone);
    console.log('Total Calls:', calls.length);
    console.log('Calls with Recording URL:', calls.filter(c => c.recordingUrl).length);
    console.log('Recording Status:');
    const statusCount = calls.reduce((acc, call) => {
      const status = call.recordingStatus || 'null';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCalls();
