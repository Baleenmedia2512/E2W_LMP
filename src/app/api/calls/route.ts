import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { randomUUID } from 'crypto';
import { notifyCallLogged, notifyCallCompleted, notifyCallLogSubmitted } from '@/shared/lib/utils/notification-service';

// GET call logs with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const leadId = searchParams.get('leadId');
    const callerId = searchParams.get('callerId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (leadId) where.leadId = leadId;
    if (callerId) where.callerId = callerId;
    if (status && status !== 'all') where.callStatus = status;

    const [callLogs, total] = await Promise.all([
      prisma.callLog.findMany({
        where,
        include: {
          Lead: { select: { id: true, name: true, phone: true, status: true } },
          User: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.callLog.count({ where }),
    ]);

    // Map the data to match frontend expectations (lead and caller instead of Lead and User)
    const formattedCallLogs = callLogs.map((log: any) => ({
      ...log,
      lead: log.Lead,
      caller: log.User,
      Lead: undefined,
      User: undefined,
    }));

    return NextResponse.json({
      success: true,
      data: formattedCallLogs,
      total,
      page,
      pageSize: limit,
      hasMore: skip + limit < total,
    });
  } catch (error) {
    console.error('Error fetching call logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch call logs' },
      { status: 500 }
    );
  }
}

// POST create new call log
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.leadId || !body.callerId) {
      return NextResponse.json(
        { success: false, error: 'leadId and callerId are required' },
        { status: 400 }
      );
    }

    const callStartTime = body.startedAt ? new Date(body.startedAt) : new Date();
    
    // 🔍 DUPLICATE PREVENTION: Check if a call log already exists for this lead around this time
    // This prevents duplicates when webhook creates call log before LMS submission
    // Widened to 10 minutes to catch Call Monitor-created logs
    const tenMinutes = 10 * 60 * 1000;
    const existingCallLog = await prisma.callLog.findFirst({
      where: {
        leadId: body.leadId,
        startedAt: {
          gte: new Date(callStartTime.getTime() - tenMinutes),
          lte: new Date(callStartTime.getTime() + tenMinutes),
        }
      },
      orderBy: {
        startedAt: 'desc'
      },
      include: {
        Lead: { select: { id: true, name: true, status: true } },
        User: { select: { id: true, name: true, email: true } },
      },
    });

    let callLog;
    
    if (existingCallLog) {
      // Found existing call log (likely from webhook) - UPDATE it instead of creating duplicate
      console.log('[Call Log API] ✅ Found existing call log - UPDATING instead of creating duplicate');
      console.log(`  Existing Call ID: ${existingCallLog.id}`);
      console.log(`  Existing has recording: ${existingCallLog.recordingUrl ? 'YES' : 'NO'}`);
      console.log(`  Time difference: ${Math.abs(existingCallLog.startedAt.getTime() - callStartTime.getTime()) / 1000}s`);
      
      // Update existing call log with LMS details (preserve recording if exists)
      callLog = await prisma.callLog.update({
        where: { id: existingCallLog.id },
        data: {
          callerId: body.callerId, // Update with actual caller
          endedAt: body.endedAt ? new Date(body.endedAt) : existingCallLog.endedAt,
          duration: body.duration || existingCallLog.duration,
          remarks: body.remarks || existingCallLog.remarks, // Use LMS remarks if provided
          callStatus: body.callStatus || existingCallLog.callStatus,
          customerRequirement: body.customerRequirement || existingCallLog.customerRequirement,
          phoneDialed: body.phoneDialed || existingCallLog.phoneDialed,
          recordingStatus: existingCallLog.recordingUrl ? 'available' : (body.recordingStatus || 'pending'),
          recordingAppCallId: body.recordingAppCallId || existingCallLog.recordingAppCallId,
          // Keep existing recordingUrl if it exists (from webhook)
        },
        include: {
          Lead: { select: { id: true, name: true, status: true } },
          User: { select: { id: true, name: true, email: true } },
        },
      });
      
      console.log('[Call Log API] ✅ Updated existing call log - no duplicate created!');
    } else {
      // No existing call log found - create new one (normal flow)
      console.log('[Call Log API] 📝 No existing call found - creating new call log');
      
      callLog = await prisma.callLog.create({
        data: {
          id: randomUUID(),
          leadId: body.leadId,
          callerId: body.callerId,
          startedAt: callStartTime,
          endedAt: body.endedAt ? new Date(body.endedAt) : null,
          duration: body.duration || null,
          remarks: body.remarks || null,
          callStatus: body.callStatus || 'answer',
          attemptNumber: body.attemptNumber || 1,
          customerRequirement: body.customerRequirement || null,
          phoneDialed: body.phoneDialed || null,
          recordingStatus: body.recordingStatus || 'pending',
          recordingAppCallId: body.recordingAppCallId || null,
        },
        include: {
          Lead: { select: { id: true, name: true, status: true } },
          User: { select: { id: true, name: true, email: true } },
        },
      });
    }

    // Get current lead to check status
    const currentLead = await prisma.lead.findUnique({
      where: { id: body.leadId },
      select: { status: true },
    });

    // Only increment call attempts if we created a NEW call log (not updated existing)
    const isNewCall = !existingCallLog;
    
    // Update lead: increment call attempts only for new calls, always update timestamp
    const updateData: any = {
      updatedAt: new Date(), // Always update the timestamp
    };
    
    // Only increment call attempts if this is a brand new call
    if (isNewCall) {
      updateData.callAttempts = { increment: 1 };
      console.log('[Call Log API] 📈 Incrementing call attempts (new call)');
    } else {
      console.log('[Call Log API] ⏭️  Skipping call attempt increment (updated existing call)');
    }

    // Status is managed separately through lead updates

    // Update remarks if provided
    if (body.customerRequirement) {
      updateData.customerRequirement = body.customerRequirement;
    }

    await prisma.lead.update({
      where: { id: body.leadId },
      data: updateData,
    });

    // Log activity only for new calls (avoid duplicate activity logs)
    if (isNewCall) {
      await prisma.activityHistory.create({
        data: {
          id: randomUUID(),
          leadId: body.leadId,
          userId: body.callerId,
          action: 'call_logged',
          description: `Call logged - Status: ${body.callStatus || 'answer'}`,
        },
      });
    } else {
      console.log('[Call Log API] ⏭️  Skipping activity log (updated existing call)');
    }

    // Send notification to assigned user (if different from caller)
    const lead = await prisma.lead.findUnique({
      where: { id: body.leadId },
      select: { assignedToId: true, name: true },
    });

    if (lead?.assignedToId) {
      try {
        // Send call log submitted notification
        await notifyCallLogSubmitted(
          body.leadId,
          lead.name,
          lead.assignedToId,
          body.callStatus || 'answer',
          body.remarks
        );

        // Send call completed notification if call was answered
        if (body.callStatus === 'answer' && body.duration) {
          await notifyCallCompleted(
            body.leadId,
            lead.name,
            lead.assignedToId,
            body.duration,
            body.remarks
          );
        }

        // Send general call logged notification if different user
        if (lead.assignedToId !== body.callerId) {
          await notifyCallLogged(
            body.leadId,
            lead.name,
            lead.assignedToId,
            body.callStatus || 'answer',
            body.duration
          );
        }
      } catch (error) {
        console.error('Failed to send call notification:', error);
      }
    }

    return NextResponse.json(
      { success: true, data: callLog },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating call log:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create call log';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}





