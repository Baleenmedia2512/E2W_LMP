import { NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { autoUpdateBusyToAnswered, autoUpdateCurrentCallStatus } from '@/shared/lib/call-status-auto-update';
import { resolveMediaUrl } from '@/shared/lib/storage/media-url';
import { saveLocalUpload } from '@/shared/lib/storage/local-upload';

/**
 * API endpoint for Call Monitor app to update a call log with
 * the recording URL after the call has been recorded and uploaded.
 * Accepts JSON { recordingUrl } or multipart { file, callLogId, ... }.
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let callLogId: string | undefined;
    let recordingUrl: string | undefined;
    let duration: number | undefined;
    let recordingAppCallId: string | undefined;
    let apiKey: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      callLogId = String(form.get('callLogId') || '');
      duration = form.get('duration') ? Number(form.get('duration')) : undefined;
      recordingAppCallId = form.get('recordingAppCallId')
        ? String(form.get('recordingAppCallId'))
        : undefined;
      apiKey = form.get('apiKey') ? String(form.get('apiKey')) : undefined;
      const file = form.get('file');
      const urlField = form.get('recordingUrl');
      if (file instanceof File) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const saved = await saveLocalUpload(
          `proposal-images/recordings/${file.name || `recording-${Date.now()}.m4a`}`,
          buffer,
          file.type || 'audio/mp4',
        );
        recordingUrl = saved.url;
      } else if (typeof urlField === 'string') {
        recordingUrl = resolveMediaUrl(urlField) || urlField;
      }
    } else {
      const body = await request.json();
      callLogId = body.callLogId;
      recordingUrl = body.recordingUrl
        ? resolveMediaUrl(body.recordingUrl) || body.recordingUrl
        : undefined;
      duration = body.duration;
      recordingAppCallId = body.recordingAppCallId;
      apiKey = body.apiKey;
    }

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

    // Prepare update data — always store MilesWeb public URL when rewrite applies
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
