import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCorrectUrl() {
  console.log('Fixing with correct bucket structure...\n');
  
  const callLogId = 'a42a6973-b39e-45ff-aaf1-abbdb2bd66e0';
  const fileName = '1770794241423_1770794241393_Call recording Adthi E2W_260211_123633.m4a';
  
  // CORRECT structure: bucket is "recordings", file is in "call-recordings" subfolder
  const correctUrl = `https://wkwrrdcjknvupwsfdjtd.supabase.co/storage/v1/object/public/recordings/call-recordings/${encodeURIComponent(fileName)}`;
  
  console.log(`Correct URL: ${correctUrl}\n`);
  
  // Test if this URL works
  console.log('Testing URL access...');
  try {
    const response = await fetch(correctUrl);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log('✅ File is accessible!\n');
      
      // Update the database
      console.log('Updating CallLog...');
      const { data, error } = await supabase
        .from('CallLog')
        .update({
          recordingUrl: correctUrl,
          recordingStatus: 'available'
        })
        .eq('id', callLogId)
        .select();
      
      if (error) {
        console.error('❌ Error:', error);
      } else {
        console.log('✅ Successfully updated CallLog!');
        console.log('\n🎉 Recording should now play in LMS!');
      }
    } else {
      console.log('❌ File still not accessible');
      const text = await response.text();
      console.log('Response:', text.substring(0, 200));
    }
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

fixCorrectUrl();
