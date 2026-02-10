import prisma from './src/shared/lib/db/prisma';

async function testWithExistingFile() {
  try {
    // Update the recent call log to use a file that we know exists
    const testFileUrl = 'https://wkwrrdcjknvupwsfdjtd.supabase.co/storage/v1/object/public/recordings/call-recordings/1770699453305_Call%20recording%20Gomathi%20Easy2work_260210_082413.m4a';
    
    console.log('Testing if this URL works first...');
    const response = await fetch(testFileUrl);
    console.log('Status:', response.status);
    
    if (!response.ok) {
      console.log('❌ Even files in Supabase are not accessible. The bucket is not truly public.');
      console.log('\n📝 You need to:');
      console.log('1. Go to Supabase Dashboard → Storage → recordings bucket');
      console.log('2. Click on any file and try to get its public URL');
      console.log('3. If there\'s no "Get public URL" option, the bucket is not public');
      console.log('4. Look for a toggle or button to make the bucket public');
      return;
    }
    
    console.log('✅ File is accessible!');
    console.log('\nUpdating database with working URL...');
    
    await prisma.callLog.update({
      where: { id: '9a8fcdc9-88b5-4574-a5e6-2f9e759d9e90' },
      data: { recordingUrl: testFileUrl }
    });
    
    console.log('✅ Database updated! Refresh your LMS page now.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWithExistingFile();
