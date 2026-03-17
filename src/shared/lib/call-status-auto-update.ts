/**
 * Auto-Update Call Status: Busy -> Answered
 * 
 * When a customer returns a call and a recording is received,
 * automatically update the previous "Busy" status to "Answered".
 * 
 * This improves reporting accuracy by reflecting actual customer interactions.
 */

import { PrismaClient } from '@prisma/client';

interface AutoUpdateResult {
  updated: boolean;
  previousCallId?: string;
  currentCallUpdated?: boolean;
  message: string;
}

/**
 * Updates the CURRENT call from "Busy" to "Answered" if it has a recording.
 * This handles cases where:
 * - Call is initially logged as "Busy" manually
 * - Recording arrives later via webhook
 * - Status needs to reflect the recording presence
 * 
 * @param prisma - Prisma client instance
 * @param callId - ID of the call to check and update
 * @returns Result indicating if update was performed
 */
export async function autoUpdateCurrentCallStatus(
  prisma: PrismaClient,
  callId: string
): Promise<AutoUpdateResult> {
  try {
    console.log('[Auto-Update Current] 🔍 Checking if current call needs status update...');
    
    const call = await prisma.callLog.findUnique({
      where: { id: callId },
      select: {
        id: true,
        callStatus: true,
        recordingUrl: true,
        recordingStatus: true,
        remarks: true,
        Lead: {
          select: {
            id: true,
            name: true,
            phone: true,
          }
        }
      }
    });

    if (!call) {
      return {
        updated: false,
        message: 'Call not found'
      };
    }

    // Check if this call is marked as "Busy" but has a recording
    const isBusy = call.callStatus === 'busy';
    const hasRecording = call.recordingUrl && call.recordingStatus === 'available';

    if (!isBusy) {
      console.log('[Auto-Update Current] ℹ️ Call status is not "Busy" - no update needed');
      return {
        updated: false,
        currentCallUpdated: false,
        message: 'Call status is not "Busy"'
      };
    }

    if (!hasRecording) {
      console.log('[Auto-Update Current] ℹ️ Call has no recording - no update needed');
      return {
        updated: false,
        currentCallUpdated: false,
        message: 'No recording available'
      };
    }

    console.log('[Auto-Update Current] 🎯 Found inconsistency: "Busy" status with recording!');
    console.log(`  Call ID: ${call.id}`);
    console.log(`  Lead: ${call.Lead.name} (${call.Lead.phone})`);
    console.log(`  Current Status: ${call.callStatus}`);
    console.log(`  Recording: ${call.recordingUrl ? 'YES' : 'NO'}`);

    // Update the call status from "Busy" to "Answered"
    await prisma.callLog.update({
      where: { id: call.id },
      data: {
        callStatus: 'answer',
        remarks: call.remarks 
          ? `${call.remarks}\n[Auto-updated: Recording indicates call was answered]`
          : '[Auto-updated from "Busy" to "Answered" - Recording indicates call was answered]',
      }
    });

    console.log('[Auto-Update Current] ✅ Successfully updated current call status to "Answered"!');

    // Create audit log entry
    const { randomUUID } = require('crypto');
    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        userId: 'SYSTEM',
        action: 'call_status_auto_updated',
        targetType: 'CallLog',
        targetId: call.id,
        changes: JSON.stringify({
          oldStatus: 'busy',
          newStatus: 'answer',
          reason: 'Recording attached to call marked as Busy',
          recordingUrl: call.recordingUrl,
        }),
        metadata: JSON.stringify({
          leadId: call.Lead.id,
          leadName: call.Lead.name,
          phoneNumber: call.Lead.phone,
          autoUpdateType: 'current_call_busy_to_answered',
        }),
      }
    });

    console.log('[Auto-Update Current] 📝 Audit log created for status change');

    return {
      updated: true,
      currentCallUpdated: true,
      message: `Updated current call status from "Busy" to "Answered"`
    };

  } catch (error) {
    console.error('[Auto-Update Current] ❌ Error during auto-update:', error);
    return {
      updated: false,
      currentCallUpdated: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Checks if a previous "Busy" call should be auto-updated to "Answered"
 * based on a new call with recording.
 * 
 * @param prisma - Prisma client instance
 * @param currentCallId - ID of the current call that has a recording
 * @param leadId - Lead ID to check for previous calls
 * @returns Result indicating if update was performed
 */
export async function autoUpdateBusyToAnswered(
  prisma: PrismaClient,
  currentCallId: string,
  leadId: string
): Promise<AutoUpdateResult> {
  try {
    console.log('[Auto-Update] 🔍 Checking for previous "Busy" calls to auto-update...');
    
    // Fetch the current call to verify it has a recording
    const currentCall = await prisma.callLog.findUnique({
      where: { id: currentCallId },
      select: {
        id: true,
        startedAt: true,
        recordingUrl: true,
        recordingStatus: true,
        callStatus: true,
        leadId: true,
        phoneDialed: true,
      }
    });

    if (!currentCall) {
      return {
        updated: false,
        message: 'Current call not found'
      };
    }

    // Only proceed if current call has a recording
    if (!currentCall.recordingUrl || currentCall.recordingStatus !== 'available') {
      console.log('[Auto-Update] ⏭️ Current call has no recording - skipping auto-update');
      return {
        updated: false,
        message: 'No recording attached to current call'
      };
    }

    console.log('[Auto-Update] ✅ Current call has recording - searching for previous "Busy" calls...');

    // Search for the most recent "Busy" call for the same lead
    // Look back up to 7 days to catch callbacks
    const sevenDaysAgo = new Date(currentCall.startedAt.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const previousBusyCall = await prisma.callLog.findFirst({
      where: {
        leadId: leadId,
        callStatus: 'busy', // Previous status must be "busy"
        startedAt: {
          gte: sevenDaysAgo, // Within last 7 days
          lt: currentCall.startedAt, // Before current call
        },
      },
      orderBy: {
        startedAt: 'desc', // Get the most recent one
      },
      include: {
        Lead: {
          select: {
            id: true,
            name: true,
            phone: true,
          }
        }
      }
    });

    if (!previousBusyCall) {
      console.log('[Auto-Update] ℹ️ No previous "Busy" call found - nothing to update');
      return {
        updated: false,
        message: 'No previous "Busy" call found within lookup window'
      };
    }

    console.log('[Auto-Update] 🎯 Found previous "Busy" call to update!');
    console.log(`  Previous Call ID: ${previousBusyCall.id}`);
    console.log(`  Previous Call Time: ${previousBusyCall.startedAt.toISOString()}`);
    console.log(`  Lead: ${previousBusyCall.Lead.name} (${previousBusyCall.Lead.phone})`);
    console.log(`  Time between calls: ${((currentCall.startedAt.getTime() - previousBusyCall.startedAt.getTime()) / (1000 * 60)).toFixed(1)} minutes`);

    // Update the previous "Busy" call to "Answered"
    await prisma.callLog.update({
      where: { id: previousBusyCall.id },
      data: {
        callStatus: 'answer', // Update to answered
        remarks: previousBusyCall.remarks 
          ? `${previousBusyCall.remarks}\n[Auto-updated: Customer returned call with recording]`
          : '[Auto-updated from "Busy" to "Answered" - Customer returned call with recording]',
      }
    });

    console.log('[Auto-Update] ✅✅✅ Successfully updated previous "Busy" call to "Answered"!');

    // Create audit log entry for transparency
    const { randomUUID } = require('crypto');
    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        userId: 'SYSTEM', // System-triggered action
        action: 'call_status_auto_updated',
        targetType: 'CallLog',
        targetId: previousBusyCall.id,
        changes: JSON.stringify({
          oldStatus: 'busy',
          newStatus: 'answer',
          reason: 'Customer returned call with recording',
          triggerCallId: currentCallId,
          triggerCallTime: currentCall.startedAt,
          previousCallTime: previousBusyCall.startedAt,
        }),
        metadata: JSON.stringify({
          leadId: leadId,
          leadName: previousBusyCall.Lead.name,
          phoneNumber: previousBusyCall.Lead.phone,
          autoUpdateType: 'busy_to_answered',
        }),
      }
    });

    console.log('[Auto-Update] 📝 Audit log created for status change');

    return {
      updated: true,
      previousCallId: previousBusyCall.id,
      message: `Auto-updated previous "Busy" call (${previousBusyCall.id}) to "Answered"`
    };

  } catch (error) {
    console.error('[Auto-Update] ❌ Error during auto-update:', error);
    // Don't throw - this is a non-critical enhancement
    // Just log the error and return failure
    return {
      updated: false,
      message: `Error during auto-update: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Check if auto-update is applicable for a call
 * This is a lightweight check before running the full update logic
 */
export function shouldCheckAutoUpdate(
  recordingUrl?: string | null,
  recordingStatus?: string | null
): boolean {
  return !!recordingUrl && recordingStatus === 'available';
}
