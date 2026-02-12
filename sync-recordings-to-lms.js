const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncRecordingsToCallLogs() {
  try {
    console.log('🔄 Syncing recordings from call_recordings to CallLog table...\n');
    
    // Get all unsynced recordings
    const unsyncedRecordings = await prisma.$queryRaw`
      SELECT * FROM call_recordings 
      WHERE is_synced = false 
      AND has_recording = true 
      AND recording_url IS NOT NULL
      ORDER BY created_at DESC
    `;
    
    console.log(`Found ${unsyncedRecordings.length} unsynced recordings\n`);
    
    let syncedCount = 0;
    let notFoundCount = 0;
    
    for (const recording of unsyncedRecordings) {
      console.log(`\n📞 Processing: ${recording.contact_name} (${recording.phone_number})`);
      console.log(`   Timestamp: ${recording.timestamp}`);
      console.log(`   Duration: ${recording.duration}s`);
      
      // Clean phone number (last 10 digits)
      const cleanPhone = recording.phone_number.replace(/\D/g, '').slice(-10);
      
      // Find matching call log (within 5 minutes of recording timestamp)
      const recordingTime = new Date(recording.timestamp);
      const fiveMinutesBefore = new Date(recordingTime.getTime() - 5 * 60 * 1000);
      const fiveMinutesAfter = new Date(recordingTime.getTime() + 5 * 60 * 1000);
      
      const matchingCallLogs = await prisma.callLog.findMany({
        where: {
          phoneDialed: {
            endsWith: cleanPhone
          },
          startedAt: {
            gte: fiveMinutesBefore,
            lte: fiveMinutesAfter
          }
        },
        include: {
          Lead: { select: { name: true, phone: true } }
        },
        orderBy: {
          startedAt: 'desc'
        },
        take: 1
      });
      
      if (matchingCallLogs.length > 0) {
        const callLog = matchingCallLogs[0];
        
        // Update CallLog with recording URL
        await prisma.callLog.update({
          where: { id: callLog.id },
          data: {
            recordingUrl: recording.recording_url,
            recordingStatus: 'available',
            duration: recording.duration || callLog.duration,
            recordingAppCallId: recording.native_call_id || recording.id
          }
        });
        
        // Mark as synced in call_recordings
        await prisma.$executeRaw`
          UPDATE call_recordings 
          SET is_synced = true, updated_at = NOW() 
          WHERE id = ${recording.id}::uuid
        `;
        
        console.log(`   ✅ Synced to CallLog: ${callLog.Lead.name}`);
        console.log(`   📝 CallLog ID: ${callLog.id}`);
        syncedCount++;
      } else {
        console.log(`   ⚠️  No matching CallLog found`);
        notFoundCount++;
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Successfully synced: ${syncedCount}`);
    console.log(`   ⚠️  No match found: ${notFoundCount}`);
    console.log(`   📁 Total processed: ${unsyncedRecordings.length}`);
    console.log('\n✨ Sync complete! Refresh your LMS to see recordings.\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncRecordingsToCallLogs();
