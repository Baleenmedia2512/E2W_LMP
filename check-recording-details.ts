import prisma from './src/shared/lib/db/prisma';

async function checkRecordingDetails() {
  try {
    // Find the call log with more details
    const callLog = await prisma.callLog.findFirst({
      where: {
        id: '9a8fcdc9-88b5-4574-a5e6-2f9e759d9e90'
      },
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
      console.log('❌ Call log not found');
      return;
    }

    console.log('📋 Full call log details:');
    console.log(JSON.stringify(callLog, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecordingDetails();
