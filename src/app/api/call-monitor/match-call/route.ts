import { NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { randomUUID } from 'crypto';

/**
 * API endpoint for Call Monitor app to check if an outgoing call
 * was initiated from LMS and get the associated lead information.
 * 
 * This allows the Call Monitor app to link recordings to the correct lead.
 */
export async function POST(request: Request) {
  try {
    const { phone, timestamp, apiKey } = await request.json();

    // Validate API key (optional security)
    const expectedApiKey = process.env.CALL_MONITOR_API_KEY;
    if (expectedApiKey && apiKey !== expectedApiKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate input
    if (!phone || !timestamp) {
      return NextResponse.json(
        { error: 'Phone number and timestamp are required' },
        { status: 400 }
      );
    }

    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = phone.replace(/[\s\-\(\)\+]/g, '');

    // Parse timestamp
    const callTime = new Date(timestamp);
    
    // STEP 1: Search for matching call log within ±10 minutes window (widened from 5)
    const matchWindow = 10 * 60 * 1000; // 10 minutes in milliseconds (increased for better matching)
    const startWindow = new Date(callTime.getTime() - matchWindow);
    const endWindow = new Date(callTime.getTime() + matchWindow);

    console.log('[Call Monitor] Searching for call log...');
    console.log(`  Phone: ${normalizedPhone}`);
    console.log(`  Time window: ${startWindow.toISOString()} to ${endWindow.toISOString()}`);

    // Try to find a call log that was pre-created - search by leadId AND time (more reliable)
    // First, find the lead
    const matchingLead = await prisma.lead.findFirst({
      where: {
        OR: [
          {
            phone: {
              endsWith: normalizedPhone.slice(-10), // Match last 10 digits
            },
          },
          {
            alternatePhone: {
              endsWith: normalizedPhone.slice(-10),
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    });

    let callLog = null;

    if (matchingLead) {
      // Search for call log by leadId AND time window (more reliable than phoneDialed)
      callLog = await prisma.callLog.findFirst({
        where: {
          leadId: matchingLead.id,
          startedAt: {
            gte: startWindow,
            lte: endWindow,
          },
          OR: [
            { recordingStatus: 'pending' },
            { recordingStatus: null },
            { recordingUrl: null },
          ],
        },
        include: {
          Lead: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
        orderBy: {
          startedAt: 'desc',
        },
      });
    }

    if (callLog) {
      console.log('[Call Monitor] ✅ Found pre-logged call:', callLog.id);
      return NextResponse.json({
        isLMSCall: true,
        callLogId: callLog.id,
        leadId: callLog.leadId,
        leadName: callLog.Lead.name,
        leadPhone: callLog.Lead.phone,
      });
    }

    // STEP 2: If no pre-logged call found, but lead exists, check for recent calls
    if (matchingLead) {
      console.log(`[Call Monitor] ✅ Lead found: ${matchingLead.name} (${matchingLead.id})`);

      // STEP 3: Check if there's a recent call log for this lead without recording
      // Use a wider 30-minute window to catch manually logged calls
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const recentCallLog = await prisma.callLog.findFirst({
        where: {
          leadId: matchingLead.id,
          startedAt: {
            gte: thirtyMinutesAgo,
          },
          OR: [
            { recordingStatus: 'pending' },
            { recordingStatus: null },
            { recordingUrl: null },
          ],
        },
        orderBy: {
          startedAt: 'desc',
        },
        include: {
          Lead: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      });

      if (recentCallLog) {
        // Link to existing call log
        console.log('[Call Monitor] ✅ Found existing call log to link:', recentCallLog.id);
        return NextResponse.json({
          isLMSCall: true,
          callLogId: recentCallLog.id,
          leadId: matchingLead.id,
          leadName: matchingLead.name,
          leadPhone: matchingLead.phone,
          linkedExisting: true,
        });
      }

      // STEP 4: No recent call log found - DON'T create automatically
      // Return lead info but indicate no call log exists yet
      // This prevents premature call log creation before user logs call in LMS
      console.log('[Call Monitor] ⚠️ No recent call log found within 30 minutes');
      console.log('[Call Monitor] 💡 Returning lead info without creating call log');
      console.log('[Call Monitor] 💡 Recording will be linked via webhook when available');
      
      return NextResponse.json({
        isLMSCall: true,
        callLogId: null,
        leadId: matchingLead.id,
        leadName: matchingLead.name,
        leadPhone: matchingLead.phone,
        autoCreated: false,
        message: 'Lead found but no recent call log - recording will be synced via webhook',
      });
    }

    // STEP 2 alternate: No matching lead found at all
    console.log('[Call Monitor] ❌ No matching lead found');
    return NextResponse.json({
      isLMSCall: false,
      message: 'No matching lead found for this phone number',
    });

  } catch (error) {
    console.error('Error in match-call API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
