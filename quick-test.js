const testUrl = 'https://wkwrrdcjknvupwsfdjtd.supabase.co/storage/v1/object/public/recordings/call-recordings/1770703731048_Call%20recording%20Ramesh%20Easy2work_260210_113756.m4a';

async function quickTest() {
  console.log('Testing if file is accessible...\n');
  console.log('URL:', testUrl, '\n');
  
  const response = await fetch(testUrl);
  console.log('Status:', response.status, response.statusText);
  console.log('Content-Type:', response.headers.get('content-type'));
  console.log('Content-Length:', response.headers.get('content-length'));
  
  if (response.ok) {
    console.log('\n✅ FILE IS ACCESSIBLE!');
    console.log('The LMS should be able to play this.');
    console.log('\n💡 If it still doesn\'t work in LMS:');
    console.log('1. Hard refresh the page (Ctrl+F5)');
    console.log('2. Check browser console for errors (F12)');
    console.log('3. The audio player might have cached the error');
  } else {
    const error = await response.text();
    console.log('\n❌ FILE IS NOT ACCESSIBLE');
    console.log('Error:', error);
    console.log('\n💡 The policy didn\'t work. Try:');
    console.log('1. Go to Supabase Storage → recordings bucket');
    console.log('2. Click the 3-dot menu on the bucket');
    console.log('3. Look for "Make bucket public" option');
    console.log('4. Or check Configuration → Policies → Verify the policy was created');
  }
}

quickTest();
