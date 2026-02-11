import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRecordingUrl() {
  console.log('Fixing recording URL for 12:36 PM call...\n');
  
  // The CallLog ID from the previous check
  const callLogId = 'a42a6973-b39e-45ff-aaf1-abbdb2bd66e0';
  
  // The recording file name from the screenshot
  const recordingFileName = '1770794241423_1770794241393_Call recording Adthi E2W_260211_123633.m4a';
  
  // Construct the full URL
  const recordingUrl = `https://wkwrrdcjknvupwsfdjtd.supabase.co/storage/v1/object/public/call-recordings/${encodeURIComponent(recordingFileName)}`;
  
  console.log(`Call Log ID: ${callLogId}`);
  console.log(`Recording URL: ${recordingUrl}\n`);
  
  // Update the CallLog entry
  const { data, error } = await supabase
    .from('CallLog')
    .update({
      recordingUrl: recordingUrl,
      recordingStatus: 'available'
    })
    .eq('id', callLogId)
    .select();
  
  if (error) {
    console.error('Error updating CallLog:', error);
    return;
  }
  
  console.log('✅ Successfully updated CallLog!');
  console.log('\nUpdated record:');
  console.log(JSON.stringify(data, null, 2));
  
  console.log('\n\nNow check your LMS - the recording should appear!');
}

fixRecordingUrl();
