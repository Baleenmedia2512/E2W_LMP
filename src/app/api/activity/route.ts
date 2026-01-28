import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { randomUUID } from 'crypto';

// GET activity history with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const leadId = searchParams.get('leadId');
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (leadId) where.leadId = leadId;
    if (userId) where.userId = userId;

    const [activities, total] = await Promise.all([
      prisma.activityHistory.findMany({
        where,
        include: {
          Lead: { select: { id: true, name: true } },
          User: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activityHistory.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: activities,
      total,
      page,
      pageSize: limit,
      hasMore: skip + limit < total,
    });
  } catch (error) {
    console.error('Error fetching activity history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity history' },
      { status: 500 }
    );
  }
}

// POST create activity history entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.leadId || !body.userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: leadId, userId' },
        { status: 400 }
      );
    }

    // Verify user exists
    const userExists = await prisma.user.findUnique({
      where: { id: body.userId },
      select: { id: true },
    });

    if (!userExists) {
      console.error('User not found:', body.userId);
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const activity = await prisma.activityHistory.create({
      data: {
        id: randomUUID(),
        leadId: body.leadId,
        userId: body.userId,
        action: body.action,
        fieldName: body.fieldName || null,
        oldValue: body.oldValue || null,
        newValue: body.newValue || null,
        description: body.description,
        metadata: body.metadata || null,
      },
      include: {
        Lead: { select: { id: true, name: true } },
        User: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(
      { success: true, data: activity },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create activity' },
      { status: 500 }
    );
  }
}





