import prisma from './src/shared/lib/db/prisma';

async function useExistingFile() {
  try {
    // Use a file that exists in Supabase
    const workingUrl = 'https://wkwrrdcjknvupwsfdjtd.supabase.co/storage/v1/object/public/recordings/call-recordings/1770703731048_Call%20recording%20Ramesh%20Easy2work_260210_113756.m4a';
    
    console.log('Updating call log to use a file that exists...');
    
    await prisma.callLog.update({
      where: { id: '9a8fcdc9-88b5-4574-a5e6-2f9e759d9e90' },
      data: { 
        recordingUrl: workingUrl,
        recordingStatus: 'available'
      }
    });
    
    console.log('✅ Done! Now refresh your LMS page - the recording should play.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

useExistingFile();
