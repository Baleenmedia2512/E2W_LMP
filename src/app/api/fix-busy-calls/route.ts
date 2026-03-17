import { NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { randomUUID } from 'crypto';

/**
 * One-time fix: Update all existing "Busy" calls that have recordings to "Answered"
 * 
 * Run this once to fix historical data
 */
export async function POST(request: Request) {
  try {
    console.log('[Fix Busy Calls] Starting one-time fix...');

    // Find all calls that are marked as "Busy" but have recordings
    const busyCallsWithRecordings = await prisma.callLog.findMany({
      where: {
        callStatus: 'busy',
        recordingUrl: { not: null },
        recordingStatus: 'available',
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

    console.log(`[Fix Busy Calls] Found ${busyCallsWithRecordings.length} calls to fix`);

    if (busyCallsWithRecordings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No calls to fix',
        fixed: 0,
      });
    }

    let fixedCount = 0;
    const fixedCalls = [];

    // Update each call
    for (const call of busyCallsWithRecordings) {
      try {
        await prisma.callLog.update({
          where: { id: call.id },
          data: {
            callStatus: 'answer',
            remarks: call.remarks 
              ? `${call.remarks}\n[Auto-fixed from "Busy" to "Answered" - Recording indicates call was answered]`
              : '[Auto-fixed from "Busy" to "Answered" - Recording indicates call was answered]',
          }
        });

        // Try to create audit log (non-critical if table doesn't exist)
        try {
          await prisma.auditLog.create({
            data: {
              id: randomUUID(),
              userId: 'SYSTEM',
              action: 'call_status_bulk_fixed',
              targetType: 'CallLog',
              targetId: call.id,
              changes: JSON.stringify({
                oldStatus: 'busy',
                newStatus: 'answer',
                reason: 'One-time fix: Recording indicates call was answered',
                recordingUrl: call.recordingUrl,
              }),
              metadata: JSON.stringify({
                leadId: call.Lead.id,
                leadName: call.Lead.name,
                phoneNumber: call.Lead.phone,
                fixType: 'bulk_busy_to_answered',
              }),
            }
          });
        } catch (auditError) {
          // Audit log is optional, don't fail the fix if it errors
          console.log('[Fix Busy Calls] ⚠️ Could not create audit log (non-critical)');
        }

        fixedCount++;
        fixedCalls.push({
          callId: call.id,
          leadName: call.Lead.name,
          phone: call.Lead.phone,
          recordingUrl: call.recordingUrl,
        });

        console.log(`[Fix Busy Calls] ✅ Fixed call ${call.id} for ${call.Lead.name}`);
      } catch (error) {
        console.error(`[Fix Busy Calls] ❌ Error fixing call ${call.id}:`, error);
      }
    }

    console.log(`[Fix Busy Calls] ✅ Completed! Fixed ${fixedCount} calls`);

    return NextResponse.json({
      success: true,
      message: `Successfully fixed ${fixedCount} calls`,
      fixed: fixedCount,
      calls: fixedCalls,
    });

  } catch (error) {
    console.error('[Fix Busy Calls] ❌ Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to preview how many calls would be fixed
export async function GET() {
  try {
    const count = await prisma.callLog.count({
      where: {
        callStatus: 'busy',
        recordingUrl: { not: null },
        recordingStatus: 'available',
      }
    });

    const calls = await prisma.callLog.findMany({
      where: {
        callStatus: 'busy',
        recordingUrl: { not: null },
        recordingStatus: 'available',
      },
      select: {
        id: true,
        startedAt: true,
        recordingUrl: true,
        Lead: {
          select: {
            name: true,
            phone: true,
          }
        }
      },
      take: 10, // Show first 10 as preview
    });

    return NextResponse.json({
      totalToFix: count,
      preview: calls,
      message: `Found ${count} calls that need fixing`,
    });

  } catch (error) {
    console.error('[Fix Busy Calls Preview] ❌ Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
