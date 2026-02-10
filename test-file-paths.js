const SUPABASE_URL = 'https://wkwrrdcjknvupwsfdjtd.supabase.co';

async function testDifferentPaths() {
  try {
    console.log('🔍 Testing different file path structures...\n');

    const filename = '1770723282215_Call recording Ramesh Easy2work_260210_170348.m4a';
    const encodedFilename = encodeURIComponent(filename);
    
    const urlsToTest = [
      // Current path in database
      `${SUPABASE_URL}/storage/v1/object/public/recordings/call-recordings/${encodedFilename}`,
      
      // Without subfolder
      `${SUPABASE_URL}/storage/v1/object/public/recordings/${encodedFilename}`,
      
      // As shown in Supabase UI
      `${SUPABASE_URL}/storage/v1/object/public/recordings/call-recordings/${filename}`,
      
      // Direct filename from list
      `${SUPABASE_URL}/storage/v1/object/public/recordings/1770699453305_Call recording Gomathi Easy2work_260210_082413.m4a`,
    ];

    for (const url of urlsToTest) {
      console.log(`Testing: ${url.substring(0, 100)}...`);
      const response = await fetch(url);
      console.log(`  Status: ${response.status}`);
      
      if (response.ok) {
        console.log(`  ✅ THIS ONE WORKS!`);
        console.log(`  File size: ${response.headers.get('content-length')} bytes\n`);
        return url;
      } else {
        console.log(`  ❌ Failed\n`);
      }
    }

    console.log('❌ None of the paths worked. The files might not exist or bucket is truly not public.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testDifferentPaths();
