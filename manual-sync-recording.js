/**
 * Manual Recording Sync Script
 * 
 * Use this to manually sync a recording from Supabase to LMS
 * when you have the recording URL and phone number.
 * 
 * Usage:
 * node manual-sync-recording.js <phone> <recordingUrl> [duration]
 * 
 * Example:
 * node manual-sync-recording.js 9360381404 "https://wkwrrdcjknvupwsfdjtd.supabase.co/storage/v1/object/public/recordings/call-recordings/1770723282215_Call%20recording%20Ramesh%20Easy2work_260210_170348.m4a" 180
 */

const LMS_URL = process.env.LMS_URL || 'http://localhost:3000';
const WEBHOOK_PATH = '/api/webhooks/supabase-recording';

async function syncRecording(phoneNumber, recordingUrl, duration) {
  console.log('📤 Syncing recording to LMS...');
  console.log('   LMS URL:', LMS_URL);
  console.log('   Phone:', phoneNumber);
  console.log('   Recording URL:', recordingUrl);
  console.log('   Duration:', duration ? `${duration}s` : 'unknown');
  console.log('');

  try {
    const response = await fetch(`${LMS_URL}${WEBHOOK_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber,
        recordingUrl,
        duration: duration ? parseInt(duration) : undefined,
        fileName: recordingUrl.split('/').pop()
      })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✅ Recording synced successfully!');
      console.log('');
      console.log('Details:');
      console.log('  Lead Name:', result.leadName);
      console.log('  Lead ID:', result.leadId);
      console.log('  Call Log ID:', result.callLogId);
      console.log('  Recording URL:', result.recordingUrl);
      console.log('');
      console.log('🎉 You can now see this recording in the LMS!');
      console.log(`   Go to: ${LMS_URL}/dashboard/leads/${result.leadId}`);
    } else {
      console.log('⚠️  Recording not synced:');
      console.log('   Reason:', result.message);
      console.log('');
      
      if (result.message.includes('No matching lead')) {
        console.log('💡 Solution:');
        console.log(`   1. Add ${phoneNumber} as a lead in LMS`);
        console.log('   2. Then run this script again');
        console.log('   OR make another call to this number');
      }
    }
  } catch (error) {
    console.error('❌ Error syncing recording:', error.message);
    console.log('');
    console.log('Troubleshooting:');
    console.log('  1. Is the LMS server running?');
    console.log('  2. Is the LMS_URL correct?');
    console.log('  3. Check network connectivity');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('');
  console.log('📞 Manual Recording Sync Tool');
  console.log('');
  console.log('This tool syncs a recording from Supabase to your LMS database.');
  console.log('');
  console.log('Usage:');
  console.log('  node manual-sync-recording.js <phone> <recordingUrl> [duration]');
  console.log('');
  console.log('Examples:');
  console.log('  node manual-sync-recording.js 9360381404 "https://supabase.co/.../recording.m4a" 180');
  console.log('  LMS_URL=https://your-domain.com node manual-sync-recording.js 9360381404 "https://..."');
  console.log('');
  console.log('Environment Variables:');
  console.log('  LMS_URL - Your LMS URL (default: http://localhost:3000)');
  console.log('');
  process.exit(1);
}

const [phoneNumber, recordingUrl, duration] = args;

syncRecording(phoneNumber, recordingUrl, duration);
