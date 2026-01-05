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
          Lead: { select: { id: true, name: true, phone: true } },
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

    const callLog = await prisma.callLog.create({
      data: {
        id: randomUUID(),
        leadId: body.leadId,
        callerId: body.callerId,
        startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
        endedAt: body.endedAt ? new Date(body.endedAt) : null,
        duration: body.duration || null,
        remarks: body.remarks || null,
        callStatus: body.callStatus || 'answer',
        attemptNumber: body.attemptNumber || 1,
        customerRequirement: body.customerRequirement || null,
      },
      include: {
        Lead: { select: { id: true, name: true } },
        User: { select: { id: true, name: true, email: true } },
      },
    });

    // Get current lead to check status
    const currentLead = await prisma.lead.findUnique({
      where: { id: body.leadId },
      select: { status: true },
    });

    // Update lead: increment call attempts and update status if it's still 'new'
    const updateData: any = {
      callAttempts: {
        increment: 1,
      },
      updatedAt: new Date(), // Always update the timestamp
    };

    // Status is managed separately through lead updates

    // Update remarks if provided
    if (body.customerRequirement) {
      updateData.customerRequirement = body.customerRequirement;
    }

    await prisma.lead.update({
      where: { id: body.leadId },
      data: updateData,
    });

    // Log activity
    await prisma.activityHistory.create({
      data: {
        id: randomUUID(),
        leadId: body.leadId,
        userId: body.callerId,
        action: 'call_logged',
        description: `Call logged - Status: ${body.callStatus || 'answer'}`,
      },
    });

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





