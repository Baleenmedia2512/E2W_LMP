import prisma from './src/shared/lib/db/prisma';

async function checkSpecificLead() {
  try {
    console.log('🔍 Checking specific lead from screenshot...\n');
    
    // Get the specific lead from the URL in screenshot
    const leadId = '12319766-5879-4019-abfb-d1c181b7b9d4';
    
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        name: true,
        phone: true,
        alternatePhone: true,
        assignedToId: true
      }
    });

    if (!lead) {
      console.log('❌ Lead not found with ID:', leadId);
      return;
    }

    console.log('✅ Found lead:', lead.name);
    console.log('   Phone:', lead.phone);
    console.log('   Alternate:', lead.alternatePhone);
    console.log('   ID:', lead.id);
    console.log('   Assigned To:', lead.assignedToId);
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
        recordingAppCallId: true,
        phoneDialed: true,
        createdAt: true,
        User: {
          select: {
            name: true
          }
        }
      }
    });

    console.log('📞 Call Logs:', calls.length, 'total\n');
    console.log('─'.repeat(80));
    
    if (calls.length === 0) {
      console.log('❌ NO CALL LOGS FOUND!');
      console.log('   This is the problem - the calls shown in the UI are not in the database!');
    } else {
      calls.forEach((call, index) => {
        console.log(`\nCall ${index + 1}:`);
        console.log(`  ID: ${call.id}`);
        console.log(`  Date: ${call.startedAt.toLocaleString()}`);
        console.log(`  Agent: ${call.User.name}`);
        console.log(`  Status: ${call.callStatus}`);
        console.log(`  Duration: ${call.duration || 0}s`);
        console.log(`  Phone Dialed: ${call.phoneDialed || 'N/A'}`);
        console.log(`  Recording URL: ${call.recordingUrl ? '✅ ' + call.recordingUrl.substring(0, 60) + '...' : '❌ NULL'}`);
        console.log(`  Recording Status: ${call.recordingStatus || '❌ NULL'}`);
        console.log(`  Recording App Call ID: ${call.recordingAppCallId || 'N/A'}`);
      });
    }

    // Check for recordings in Supabase Storage
    const normalizedPhone = lead.phone.replace(/\D/g, '').slice(-10);
    console.log('\n\n📊 Analysis:');
    console.log('─'.repeat(80));
    console.log('Lead Phone (normalized):', normalizedPhone);
    console.log('Total Calls in LMS DB:', calls.length);
    console.log('Calls with Recording URL:', calls.filter(c => c.recordingUrl).length);
    console.log('Calls with "available" status:', calls.filter(c => c.recordingStatus === 'available').length);
    console.log('Calls with "pending" status:', calls.filter(c => c.recordingStatus === 'pending').length);

    console.log('\n🔴 ISSUE IDENTIFIED:');
    if (calls.length === 0) {
      console.log('   The calls shown in the screenshot (5 calls on Feb 11) are NOT in the database!');
      console.log('   This means the calls were created in the UI but not saved to PostgreSQL.');
    } else if (calls.filter(c => c.recordingUrl).length === 0) {
      console.log('   Calls exist but NO recording URLs are saved in the database!');
      console.log('   The webhook is not updating the call logs with recording URLs.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpecificLead();
