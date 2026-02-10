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
    
    // STEP 1: Search for matching call log within ±5 minutes window
    const matchWindow = 5 * 60 * 1000; // 5 minutes in milliseconds
    const startWindow = new Date(callTime.getTime() - matchWindow);
    const endWindow = new Date(callTime.getTime() + matchWindow);

    console.log('[Call Monitor] Searching for call log...');
    console.log(`  Phone: ${normalizedPhone}`);
    console.log(`  Time window: ${startWindow.toISOString()} to ${endWindow.toISOString()}`);

    // Try to find a call log that was pre-created with phoneDialed
    let callLog = await prisma.callLog.findFirst({
      where: {
        phoneDialed: {
          endsWith: normalizedPhone.slice(-10), // Match last 10 digits
        },
        startedAt: {
          gte: startWindow,
          lte: endWindow,
        },
        OR: [
          { recordingStatus: 'pending' },
          { recordingStatus: null },
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

    // STEP 2: If no pre-logged call found, search for lead by phone number
    console.log('[Call Monitor] No pre-logged call, searching for lead by phone...');
    
    const lead = await prisma.lead.findFirst({
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
        assignedToId: true,
      },
    });

    if (!lead) {
      // No matching lead found
      console.log('[Call Monitor] ❌ No matching lead found');
      return NextResponse.json({
        isLMSCall: false,
        message: 'No matching lead found for this phone number',
      });
    }

    console.log(`[Call Monitor] ✅ Lead found: ${lead.name} (${lead.id})`);

    // STEP 3: Check if there's a recent call log for this lead without recording
    const recentCallLog = await prisma.callLog.findFirst({
      where: {
        leadId: lead.id,
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
        leadId: lead.id,
        leadName: lead.name,
        leadPhone: lead.phone,
        linkedExisting: true,
      });
    }

    // STEP 4: No recent call log found - create a new one
    console.log('[Call Monitor] Creating new call log...');
    
    const newCallLog = await prisma.callLog.create({
      data: {
        id: randomUUID(),
        leadId: lead.id,
        callerId: lead.assignedToId || 'system',
        startedAt: callTime,
        phoneDialed: normalizedPhone,
        callStatus: 'answer',
        recordingStatus: 'pending',
        attemptNumber: 1,
      },
    });

    // Update lead's call attempts
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        callAttempts: {
          increment: 1,
        },
        updatedAt: new Date(),
      },
    });

    // Log activity
    await prisma.activityHistory.create({
      data: {
        id: randomUUID(),
        leadId: lead.id,
        userId: lead.assignedToId || 'system',
        action: 'call_logged',
        description: 'Call detected by Call Monitor app',
      },
    });

    console.log('[Call Monitor] ✅ New call log created:', newCallLog.id);

    return NextResponse.json({
      isLMSCall: true,
      callLogId: newCallLog.id,
      leadId: lead.id,
      leadName: lead.name,
      leadPhone: lead.phone,
      autoCreated: true,
    });

  } catch (error) {
    console.error('Error in match-call API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
