/**
 * Quick Test: LMS Recording Integration
 * 
 * This script tests if the recording update endpoint is working
 * 
 * Usage: node test-recording-update.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const API_KEY = process.env.CALL_MONITOR_API_KEY || 'your-secret-key-here-change-this-123456';
const LMS_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testRecordingUpdate() {
  console.log('🧪 Testing LMS Recording Update Endpoint\n');
  console.log('─'.repeat(80));
  
  try {
    // Step 1: Find a recent call log
    console.log('Step 1: Finding a recent call log...');
    
    const recentCall = await prisma.callLog.findFirst({
      where: {
        recordingStatus: 'pending',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        Lead: { select: { name: true, phone: true } },
      },
    });

    if (!recentCall) {
      console.log('❌ No pending call logs found.');
      console.log('   Create a test call first by clicking "Call Now" in LMS.');
      return;
    }

    console.log(`✅ Found call: ${recentCall.Lead.name}`);
    console.log(`   CallLog ID: ${recentCall.id}`);
    console.log(`   Phone: ${recentCall.Lead.phone}`);
    console.log(`   Status: ${recentCall.recordingStatus}`);
    console.log('');

    // Step 2: Test the update endpoint
    console.log('Step 2: Testing update-recording endpoint...');
    
    const testRecordingUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
    
    const response = await fetch(
      `${LMS_URL}/api/call-monitor/update-recording`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callLogId: recentCall.id,
          recordingUrl: testRecordingUrl,
          duration: 120, // 2 minutes
          recordingAppCallId: 'test-recording-123',
          apiKey: API_KEY,
        }),
      }
    );

    console.log(`Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ API Error Response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ API Response:', JSON.stringify(data, null, 2));
    console.log('');

    // Step 3: Verify database update
    console.log('Step 3: Verifying database update...');
    
    const updatedCall = await prisma.callLog.findUnique({
      where: { id: recentCall.id },
    });

    if (!updatedCall) {
      console.log('❌ Call log not found after update');
      return;
    }

    console.log('Database Values:');
    console.log(`  Recording URL: ${updatedCall.recordingUrl}`);
    console.log(`  Recording Status: ${updatedCall.recordingStatus}`);
    console.log(`  Duration: ${updatedCall.duration}`);
    console.log(`  Recording App Call ID: ${updatedCall.recordingAppCallId}`);
    console.log('');

    if (updatedCall.recordingUrl && updatedCall.recordingStatus === 'available') {
      console.log('✅ SUCCESS! Recording data updated correctly in database');
      console.log('');
      console.log('Next Steps:');
      console.log('  1. Open LMS in browser');
      console.log(`  2. Go to lead: ${recentCall.Lead.name}`);
      console.log('  3. Check call logs - should see play button ▶️');
      console.log('  4. Click play to test audio playback');
    } else {
      console.log('⚠️ Recording data not updated as expected');
      console.log('   Check API logs for errors');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }

  console.log('');
  console.log('─'.repeat(80));
}

// Run test
testRecordingUpdate()
  .then(() => {
    console.log('✅ Test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
