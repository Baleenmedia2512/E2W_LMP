import { NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { autoUpdateBusyToAnswered, autoUpdateCurrentCallStatus } from '@/shared/lib/call-status-auto-update';

/**
 * API endpoint for Call Monitor app to update a call log with
 * the recording URL after the call has been recorded and uploaded.
 */
export async function POST(request: Request) {
  try {
    const { callLogId, recordingUrl, duration, recordingAppCallId, apiKey } = await request.json();

    console.log('[Update Recording] Request received:');
    console.log(`  Call Log ID: ${callLogId}`);
    console.log(`  Recording URL: ${recordingUrl}`);
    console.log(`  Duration: ${duration}s`);

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

    // Prepare update data
    const updateData: any = {
      recordingUrl,
      recordingStatus: 'available',
      recordingAppCallId: recordingAppCallId || undefined,
      duration: duration || existingCallLog.duration,
    };

    // AUTO-UPDATE: If status is "busy" but we're adding a recording, change to "answered"
    if (existingCallLog.callStatus === 'busy') {
      console.log('[Update Recording] 🔄 Auto-updating status: "Busy" → "Answered" (recording indicates call was answered)');
      updateData.callStatus = 'answer';
      updateData.remarks = existingCallLog.remarks 
        ? `${existingCallLog.remarks}\n[Auto-updated: Recording indicates call was answered]`
        : '[Auto-updated from "Busy" to "Answered" - Recording indicates call was answered]';
    }

    // Update call log with recording information
    const updatedCallLog = await prisma.callLog.update({
      where: { id: callLogId },
      data: updateData,
    });

    console.log('[Update Recording] ✅ Recording URL updated successfully!');
    console.log(`  Call Log: ${updatedCallLog.id}`);
    console.log(`  Lead: ${existingCallLog.leadId}`);
    console.log(`  Status: ${updatedCallLog.recordingStatus}`);

    // Auto-update PREVIOUS "Busy" calls to "Answered" (non-blocking)
    autoUpdateBusyToAnswered(prisma, updatedCallLog.id, existingCallLog.leadId).then((result) => {
      if (result.updated) {
        console.log('[Update Recording] 🔄 Previous call updated:', result.message);
      }
    }).catch(err => {
      console.error('[Update Recording] ⚠️ Previous call auto-update error (non-critical):', err);
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
