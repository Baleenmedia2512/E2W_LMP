import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';

// PUT/PATCH update follow-up
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const followUp = await prisma.followUp.update({
      where: { id: params.id },
      data: {
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        customerRequirement: body.customerRequirement !== undefined ? body.customerRequirement : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
      },
      include: {
        Lead: { select: { id: true, name: true } },
        User: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, data: followUp });
  } catch (error) {
    console.error('Error updating follow-up:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update follow-up' },
      { status: 500 }
    );
  }
}

// PATCH also works for updates
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return PUT(request, { params });
}

// DELETE follow-up
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.followUp.delete({ where: { id: params.id } });

    return NextResponse.json(
      { success: true, message: 'Follow-up deleted successfully' }
    );
  } catch (error) {
    console.error('Error deleting follow-up:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete follow-up' },
      { status: 500 }
    );
  }
}
