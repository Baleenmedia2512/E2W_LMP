/**
 * Test the Supabase recording webhook with actual data
 * This simulates what Supabase Storage webhook would send
 */

async function testRecordingWebhook() {
  console.log('🧪 Testing Recording Sync Webhook\n');
  console.log('═'.repeat(80));
  
  // Actual recording from your Supabase storage
  const actualFileName = '1770789394301_1770789394111_Call recording Adthi E2W_260211_112454.m4a';
  const actualUrl = `https://wkwrrdcjknvupwsfdjtd.supabase.co/storage/v1/object/public/recordings/call-recordings/${encodeURIComponent(actualFileName)}`;
  
  console.log('📁 Test File:', actualFileName);
  console.log('🔗 Recording URL:', actualUrl);
  console.log('');
  
  // Test 1: Supabase webhook format (what Supabase would send)
  console.log('📤 Test 1: Supabase Webhook Format');
  console.log('─'.repeat(80));
  
  const supabasePayload = {
    type: 'INSERT',
    record: {
      name: actualFileName,
      bucket_id: 'recordings',
      metadata: {}
    }
  };
  
  console.log('Payload:', JSON.stringify(supabasePayload, null, 2));
  
  try {
    // Use production URL on Vercel
    const webhookUrl = 'https://e2wleadmanager.vercel.app/api/webhooks/supabase-recording';
    
    const response1 = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(supabasePayload)
    });
    
    const result1 = await response1.json();
    console.log('\n✅ Response:', JSON.stringify(result1, null, 2));
    
    if (result1.success) {
      console.log('\n🎉 SUCCESS! Recording synced to LMS!');
      console.log('   Call Log ID:', result1.callLogId);
      console.log('   Lead:', result1.leadName);
    } else {
      console.log('\n⚠️ Sync failed:', result1.message);
      
      // Test 2: Try with explicit phone number
      console.log('\n\n📤 Test 2: Direct Format (with explicit phone)');
      console.log('─'.repeat(80));
      
      const directPayload = {
        phoneNumber: '9360515518', // The lead's actual phone
        recordingUrl: actualUrl,
        duration: 45,
        fileName: actualFileName
      };
      
      console.log('Payload:', JSON.stringify(directPayload, null, 2));
      
      const response2 = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(directPayload)
      });
      
      const result2 = await response2.json();
      console.log('\n✅ Response:', JSON.stringify(result2, null, 2));
      
      if (result2.success) {
        console.log('\n🎉 SUCCESS! Recording synced with explicit phone!');
        console.log('   Call Log ID:', result2.callLogId);
        console.log('   Lead:', result2.leadName);
      } else {
        console.log('\n❌ Still failed:', result2.message);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error testing webhook:', error);
    console.log('\n💡 Make sure your app is running: npm run dev');
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log('📊 Next Steps:');
  console.log('   1. Check the call logs in LMS UI');
  console.log('   2. Look for recording player with play button');
  console.log('   3. Verify recording URL is populated in database');
  console.log('');
}

// Run the test
testRecordingWebhook();
