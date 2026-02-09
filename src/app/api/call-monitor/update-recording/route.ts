import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';

/**
 * API endpoint for Call Monitor app to update a call log with
 * the recording URL after the call has been recorded and uploaded.
 */
export async function POST(request: Request) {
  try {
    const { callLogId, recordingUrl, duration, recordingAppCallId, apiKey } = await request.json();

    // Validate API key (optional security)
    const expectedApiKey = process.env.CALL_MONITOR_API_KEY;
    if (expectedApiKey && apiKey !== expectedApiKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate input
    if (!callLogId || !recordingUrl) {
      return NextResponse.json(
        { error: 'Call log ID and recording URL are required' },
        { status: 400 }
      );
    }

    // Check if call log exists
    const existingCallLog = await prisma.callLog.findUnique({
      where: { id: callLogId },
    });

    if (!existingCallLog) {
      return NextResponse.json(
        { error: 'Call log not found' },
        { status: 404 }
      );
    }

    // Update call log with recording information
    const updatedCallLog = await prisma.callLog.update({
      where: { id: callLogId },
      data: {
        recordingUrl,
        recordingStatus: 'available',
        recordingAppCallId: recordingAppCallId || undefined,
        duration: duration || existingCallLog.duration, // Update duration if provided
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Recording URL updated successfully',
      callLogId: updatedCallLog.id,
    });

  } catch (error) {
    console.error('Error in update-recording API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
