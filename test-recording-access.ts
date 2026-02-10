import prisma from './src/shared/lib/db/prisma';

async function testRecordingAccess() {
  try {
    // Find a call log with a recording
    const callLog = await prisma.callLog.findFirst({
      where: {
        recordingUrl: { not: null },
        recordingStatus: 'available'
      },
      select: {
        id: true,
        recordingUrl: true,
        recordingStatus: true,
        duration: true,
        Lead: {
          select: {
            name: true,
            phone: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!callLog) {
      console.log('❌ No call logs with recordings found');
      return;
    }

    console.log('✅ Found call log with recording:');
    console.log('Call Log ID:', callLog.id);
    console.log('Lead:', callLog.Lead.name);
    console.log('Phone:', callLog.Lead.phone);
    console.log('Recording URL:', callLog.recordingUrl);
    console.log('Recording Status:', callLog.recordingStatus);
    console.log('Duration:', callLog.duration);

    // Test if URL is accessible
    if (callLog.recordingUrl) {
      console.log('\n🔍 Testing URL accessibility...');
      console.log('URL Length:', callLog.recordingUrl.length);
      console.log('URL has newlines:', callLog.recordingUrl.includes('\n'));
      console.log('URL has carriage returns:', callLog.recordingUrl.includes('\r'));
      
      const response = await fetch(callLog.recordingUrl, {
        method: 'HEAD'
      });
      
      console.log('Response Status:', response.status);
      console.log('Response Status Text:', response.statusText);
      
      // Get error body
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error Response:', errorText);
      }
      
      if (response.ok) {
        console.log('✅ Recording URL is accessible!');
      } else {
        console.log('❌ Recording URL is not accessible. Status:', response.status);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRecordingAccess();
