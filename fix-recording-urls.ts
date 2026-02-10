import prisma from './src/shared/lib/db/prisma';

async function fixRecordingUrls() {
  try {
    // Find all call logs with recording URLs
    const callLogs = await prisma.callLog.findMany({
      where: {
        recordingUrl: { not: null }
      },
      select: {
        id: true,
        recordingUrl: true
      }
    });

    console.log(`Found ${callLogs.length} call logs with recording URLs`);

    let fixed = 0;
    for (const callLog of callLogs) {
      if (!callLog.recordingUrl) continue;

      // Extract the filename from the URL
      const urlParts = callLog.recordingUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      // Check if filename needs encoding (has spaces or special chars)
      if (fileName !== encodeURIComponent(fileName)) {
        // Rebuild URL with properly encoded filename
        const baseUrl = callLog.recordingUrl.substring(0, callLog.recordingUrl.lastIndexOf('/'));
        const newUrl = `${baseUrl}/${encodeURIComponent(fileName)}`;
        
        // Also remove any newlines or extra whitespace
        const cleanUrl = newUrl.replace(/\s+/g, '').trim();
        
        console.log(`Fixing: ${callLog.id}`);
        console.log(`  Old: ${callLog.recordingUrl}`);
        console.log(`  New: ${cleanUrl}`);
        
        await prisma.callLog.update({
          where: { id: callLog.id },
          data: { recordingUrl: cleanUrl }
        });
        
        fixed++;
      }
    }

    console.log(`\n✅ Fixed ${fixed} recording URLs!`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRecordingUrls();
