import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';

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
          lead: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
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

    const activity = await prisma.activityHistory.create({
      data: {
        leadId: body.leadId,
        userId: body.userId,
        action: body.action,
        fieldName: body.fieldName || null,
        oldValue: body.oldValue || null,
        newValue: body.newValue || null,
        description: body.description,
      },
      include: {
        lead: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
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





