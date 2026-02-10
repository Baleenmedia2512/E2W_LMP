const SUPABASE_URL = 'https://wkwrrdcjknvupwsfdjtd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_73UiGDZxG1S9crINx6Q6Og_iaAXBQi_';

async function checkSupabaseStorage() {
  try {
    console.log('🔍 Checking Supabase Storage setup...\n');

    // Try to list buckets
    console.log('1. Checking if we can access storage endpoint...');
    const bucketsResponse = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });

    console.log(`Response: ${bucketsResponse.status} ${bucketsResponse.statusText}`);
    
    if (bucketsResponse.ok) {
      const buckets = await bucketsResponse.json();
      console.log('✅ Found buckets:', buckets.map(b => b.name).join(', '));
      
      // Check if recordings bucket exists
      const recordingsBucket = buckets.find(b => b.name === 'recordings');
      if (recordingsBucket) {
        console.log('\n✅ "recordings" bucket exists!');
        console.log('Bucket details:', JSON.stringify(recordingsBucket, null, 2));
      } else {
        console.log('\n❌ "recordings" bucket NOT found!');
        console.log('Available buckets:', buckets.map(b => b.name).join(', '));
      }
    } else {
      console.log('❌ Cannot access storage. Response:', await bucketsResponse.text());
    }

    // Try to list files in recordings bucket
    console.log('\n2. Trying to list files in "recordings" bucket...');
    const filesResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/list/recordings`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });

    console.log(`Response: ${filesResponse.status} ${filesResponse.statusText}`);
    
    if (filesResponse.ok) {
      const files = await filesResponse.json();
      console.log('✅ Found files:', files.length);
      if (files.length > 0) {
        console.log('First few files:', files.slice(0, 5).map(f => f.name));
      }
    } else {
      const error = await filesResponse.text();
      console.log('❌ Cannot list files:', error);
    }

    // Test the specific recording URL
    console.log('\n3. Testing specific recording file...');
    const testUrl = 'https://wkwrrdcjknvupwsfdjtd.supabase.co/storage/v1/object/public/recordings/call-recordings/1770723282215_Call%20recording%20Ramesh%20Easy2work_260210_170348.m4a';
    
    const fileResponse = await fetch(testUrl);
    console.log(`Response: ${fileResponse.status} ${fileResponse.statusText}`);
    
    if (!fileResponse.ok) {
      const errorText = await fileResponse.text();
      console.log('Error:', errorText);
    } else {
      console.log('✅ File is accessible!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkSupabaseStorage();
