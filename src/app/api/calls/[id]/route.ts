import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';

// PUT update existing call log
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const callLogId = params.id;
    const body = await request.json();

    // Validate call log exists
    const existingCallLog = await prisma.callLog.findUnique({
      where: { id: callLogId },
    });

    if (!existingCallLog) {
      return NextResponse.json(
        { success: false, error: 'Call log not found' },
        { status: 404 }
      );
    }

    // Update only allowed fields
    const updateData: any = {};
    if (body.remarks !== undefined) updateData.remarks = body.remarks;
    if (body.callStatus !== undefined) updateData.callStatus = body.callStatus;
    if (body.customerRequirement !== undefined) updateData.customerRequirement = body.customerRequirement;

    const updatedCallLog = await prisma.callLog.update({
      where: { id: callLogId },
      data: updateData,
      include: {
        Lead: { select: { id: true, name: true, phone: true } },
        User: { select: { id: true, name: true, email: true } },
      },
    });

    // Format response
    const formattedCallLog = {
      ...updatedCallLog,
      lead: updatedCallLog.Lead,
      caller: updatedCallLog.User,
      Lead: undefined,
      User: undefined,
    };

    return NextResponse.json({
      success: true,
      data: formattedCallLog,
    });
  } catch (error) {
    console.error('Error updating call log:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update call log';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE call log (optional - for future use)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const callLogId = params.id;

    // Validate call log exists
    const existingCallLog = await prisma.callLog.findUnique({
      where: { id: callLogId },
    });

    if (!existingCallLog) {
      return NextResponse.json(
        { success: false, error: 'Call log not found' },
        { status: 404 }
      );
    }

    await prisma.callLog.delete({
      where: { id: callLogId },
    });

    return NextResponse.json({
      success: true,
      message: 'Call log deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting call log:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete call log';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
