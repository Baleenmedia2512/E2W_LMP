import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCallLogRecording() {
  try {
    // The call log ID from the logs
    const callLogId = 'c638825a-e95c-4630-bea9-9c8fe1a9e301';
    
    console.log('🔍 Checking call log:', callLogId);
    console.log('');
    
    const callLog = await prisma.callLog.findUnique({
      where: { id: callLogId },
      include: {
        Lead: {
          select: {
            name: true,
            phone: true
          }
        }
      }
    });
    
    if (!callLog) {
      console.log('❌ Call log not found!');
      return;
    }
    
    console.log('��� Call Log Found:');
    console.log('  Lead:', callLog.Lead.name);
    console.log('  Phone:', callLog.Lead.phone);
    console.log('  Started At:', callLog.startedAt);
    console.log('  Duration:', callLog.duration, 'seconds');
    console.log('  Status:', callLog.callStatus);
    console.log('  Recording URL:', callLog.recordingUrl || 'NULL');
    console.log('  Recording Status:', callLog.recordingStatus);
    console.log('  Remarks:', callLog.remarks || '(none)');
    console.log('');
    
    // Also check for other recent call logs for this lead
    console.log('📋 All recent call logs for this lead:');
    const allCallLogs = await prisma.callLog.findMany({
      where: {
        leadId: callLog.leadId,
        startedAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      },
      orderBy: {
        startedAt: 'desc'
      },
      select: {
        id: true,
        startedAt: true,
        duration: true,
        recordingUrl: true,
        recordingStatus: true,
        remarks: true
      }
    });
    
    allCallLogs.forEach((log, index) => {
      console.log(`\n${index + 1}. Call at ${log.startedAt.toLocaleTimeString()}`);
      console.log(`   ID: ${log.id}`);
      console.log(`   Duration: ${log.duration}s`);
      console.log(`   Recording: ${log.recordingUrl ? 'YES' : 'NO'}`);
      console.log(`   Status: ${log.recordingStatus}`);
      console.log(`   Remarks: ${log.remarks || '(none)'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCallLogRecording();
