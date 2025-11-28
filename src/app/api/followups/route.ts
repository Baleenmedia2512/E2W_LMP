import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';

// GET follow-ups with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const leadId = searchParams.get('leadId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (leadId) where.leadId = leadId;
    if (status) where.status = status;

    const [followUps, total] = await Promise.all([
      prisma.followUp.findMany({
        where,
        include: {
          lead: { select: { id: true, name: true, phone: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.followUp.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: followUps,
      total,
      page,
      pageSize: limit,
      hasMore: skip + limit < total,
    });
  } catch (error) {
    console.error('Error fetching follow-ups:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch follow-ups' },
      { status: 500 }
    );
  }
}

// POST create new follow-up
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const followUp = await prisma.followUp.create({
      data: {
        leadId: body.leadId,
        scheduledAt: new Date(body.scheduledAt),
        completedAt: body.completedAt ? new Date(body.completedAt) : null,
        notes: body.notes || null,
        status: body.status || 'pending',
        priority: body.priority || 'medium',
        createdById: body.createdById,
      },
      include: {
        lead: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Log activity
    await prisma.activityHistory.create({
      data: {
        leadId: body.leadId,
        userId: body.createdById,
        action: 'followup_scheduled',
        description: `Follow-up scheduled for ${new Date(body.scheduledAt).toLocaleDateString()}`,
      },
    });

    return NextResponse.json(
      { success: true, data: followUp },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating follow-up:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create follow-up' },
      { status: 500 }
    );
  }
}





