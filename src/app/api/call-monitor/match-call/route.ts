import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';

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
    
    // Search for matching call log within ±3 minutes window
    const matchWindow = 3 * 60 * 1000; // 3 minutes in milliseconds
    const startWindow = new Date(callTime.getTime() - matchWindow);
    const endWindow = new Date(callTime.getTime() + matchWindow);

    // Find matching call log
    const callLog = await prisma.callLog.findFirst({
      where: {
        phoneDialed: {
          endsWith: normalizedPhone.slice(-10), // Match last 10 digits
        },
        startedAt: {
          gte: startWindow,
          lte: endWindow,
        },
        recordingStatus: 'pending', // Only match calls without recordings yet
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

    if (!callLog) {
      // No matching LMS call found
      return NextResponse.json({
        isLMSCall: false,
        message: 'No matching LMS call found',
      });
    }

    // Return match information
    return NextResponse.json({
      isLMSCall: true,
      callLogId: callLog.id,
      leadId: callLog.leadId,
      leadName: callLog.Lead.name,
      leadPhone: callLog.Lead.phone,
    });

  } catch (error) {
    console.error('Error in match-call API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
