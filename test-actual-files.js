const SUPABASE_URL = 'https://wkwrrdcjknvupwsfdjtd.supabase.co';

async function testRecordingFiles() {
  try {
    console.log('🔍 Testing recording file access...\n');

    // Test the exact file from the database
    const fileUrl = 'https://wkwrrdcjknvupwsfdjtd.supabase.co/storage/v1/object/public/recordings/call-recordings/1770723282215_Call%20recording%20Ramesh%20Easy2work_260210_170348.m4a';
    
    console.log('Testing URL:', fileUrl);
    
    const response = await fetch(fileUrl);
    console.log('Status:', response.status, response.statusText);
    console.log('Content-Type:', response.headers.get('content-type'));
    console.log('Content-Length:', response.headers.get('content-length'));
    
    if (response.ok) {
      console.log('\n✅ File is accessible!');
      console.log('File size:', (parseInt(response.headers.get('content-length') || '0') / 1024).toFixed(2), 'KB');
    } else {
      const error = await response.text();
      console.log('\n❌ Error:', error);
      console.log('\n💡 This usually means:');
      console.log('   1. Bucket policies are not configured for public access');
      console.log('   2. File path is incorrect');
      console.log('   3. File does not exist at this exact path');
    }

    // Test a simpler path
    console.log('\n📝 Also testing another file from the visible list...');
    const testFile = 'https://wkwrrdcjknvupwsfdjtd.supabase.co/storage/v1/object/public/recordings/call-recordings/1770699453305_Call recording Gomathi Easy2work_260210_082413.m4a';
    const testResponse = await fetch(testFile);
    console.log('Status:', testResponse.status);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testRecordingFiles();
