import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';

// GET call logs with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const leadId = searchParams.get('leadId');
    const callerId = searchParams.get('callerId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (leadId) where.leadId = leadId;
    if (callerId) where.callerId = callerId;

    const [callLogs, total] = await Promise.all([
      prisma.callLog.findMany({
        where,
        include: {
          lead: { select: { id: true, name: true, phone: true } },
          caller: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.callLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: callLogs,
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

    const callLog = await prisma.callLog.create({
      data: {
        leadId: body.leadId,
        callerId: body.callerId,
        startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
        endedAt: body.endedAt ? new Date(body.endedAt) : null,
        duration: body.duration || null,
        remarks: body.remarks || null,
        callStatus: body.callStatus || 'completed',
        attemptNumber: body.attemptNumber || 1,
        customerRequirement: body.customerRequirement || null,
      },
      include: {
        lead: { select: { id: true, name: true } },
        caller: { select: { id: true, name: true, email: true } },
      },
    });

    // Log activity
    await prisma.activityHistory.create({
      data: {
        leadId: body.leadId,
        userId: body.callerId,
        action: 'call_logged',
        description: `Call logged - Status: ${body.callStatus || 'completed'}`,
      },
    });

    return NextResponse.json(
      { success: true, data: callLog },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating call log:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create call log' },
      { status: 500 }
    );
  }
}





