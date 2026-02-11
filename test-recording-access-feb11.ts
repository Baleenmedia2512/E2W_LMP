import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAccess() {
  console.log('Testing recording file access...\n');
  
  const fileName = '1770794241423_1770794241393_Call recording Adthi E2W_260211_123633.m4a';
  
  // Check if file exists in storage
  console.log('1. Checking if file exists in call-recordings bucket...');
  const { data: files, error: listError } = await supabase
    .storage
    .from('call-recordings')
    .list('', { search: fileName });
  
  if (listError) {
    console.error('❌ Error listing files:', listError);
  } else {
    console.log(`✅ Found ${files?.length || 0} matching files`);
    if (files && files.length > 0) {
      console.log(`   File: ${files[0].name} (${files[0].metadata?.size} bytes)`);
    }
  }
  
  // Check bucket configuration
  console.log('\n2. Checking bucket configuration...');
  const { data: buckets, error: bucketsError } = await supabase
    .storage
    .listBuckets();
  
  if (bucketsError) {
    console.error('❌ Error listing buckets:', bucketsError);
  } else {
    const callRecBucket = buckets?.find(b => b.name === 'call-recordings');
    if (callRecBucket) {
      console.log('✅ call-recordings bucket found:');
      console.log(`   ID: ${callRecBucket.id}`);
      console.log(`   Public: ${callRecBucket.public}`);
      console.log(`   Created: ${callRecBucket.created_at}`);
    } else {
      console.log('❌ call-recordings bucket NOT found');
    }
  }
  
  // Try to get public URL
  console.log('\n3. Getting public URL...');
  const { data: publicUrl } = supabase
    .storage
    .from('call-recordings')
    .getPublicUrl(fileName);
  
  console.log(`   Public URL: ${publicUrl.publicUrl}`);
  
  // Try to download the file
  console.log('\n4. Attempting to download file...');
  const { data: downloadData, error: downloadError } = await supabase
    .storage
    .from('call-recordings')
    .download(fileName);
  
  if (downloadError) {
    console.error('❌ Download error:', downloadError);
  } else {
    console.log(`✅ File downloaded successfully (${downloadData?.size} bytes)`);
  }
  
  // Test actual HTTP access
  console.log('\n5. Testing HTTP access to public URL...');
  try {
    const response = await fetch(publicUrl.publicUrl);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.ok) {
      console.log('✅ File is publicly accessible via HTTP');
    } else {
      console.log('❌ File is NOT accessible via HTTP');
      const text = await response.text();
      console.log(`   Response: ${text.substring(0, 200)}`);
    }
  } catch (err) {
    console.error('❌ HTTP request failed:', err);
  }
}

testAccess();
