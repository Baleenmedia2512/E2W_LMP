import prisma from './src/shared/lib/db/prisma';

async function testVariousUrls() {
  try {
    const baseUrl = 'https://wkwrrdcjknvupwsfdjtd.supabase.co/storage/v1/object/public';
    const fileName = '1770723282215_Call%20recording%20Ramesh%20Easy2work_260210_170348.m4a';
    
    // Try different URL structures
    const urls = [
      `${baseUrl}/recordings/call-recordings/${fileName}`,
      `${baseUrl}/recordings/${fileName}`,
      `${baseUrl}/call-recordings/${fileName}`,
    ];

    console.log('🔍 Testing different URL structures...\n');

    for (const url of urls) {
      console.log(`Testing: ${url}`);
      try {
        const response = await fetch(url, { method: 'HEAD' });
        console.log(`  Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          console.log(`  ✅ This URL works!`);
          
          // Update the database with the correct URL
          await prisma.callLog.updateMany({
            where: {
              recordingUrl: {
                contains: fileName.replace(/%20/g, ' ')
              }
            },
            data: {
              recordingUrl: url
            }
          });
          
          console.log(`  📝 Updated database with correct URL\n`);
          break;
        } else {
          console.log(`  ❌ Failed\n`);
        }
      } catch (error) {
        console.log(`  ❌ Error:`, error instanceof Error ? error.message : 'Unknown error', '\n');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testVariousUrls();
