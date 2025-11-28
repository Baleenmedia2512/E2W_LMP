import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';

// GET single lead by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        callLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
        followUps: { orderBy: { scheduledAt: 'desc' }, take: 10 },
      },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: lead });
  } catch (error) {
    console.error('Error fetching lead:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lead' },
      { status: 500 }
    );
  }
}

// PUT/PATCH update lead
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const userId = body.updatedById || 'system';

    // Get old values for activity tracking
    const oldLead = await prisma.lead.findUnique({ where: { id: params.id } });

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: {
        name: body.name || undefined,
        phone: body.phone || undefined,
        email: body.email !== undefined ? body.email : undefined,
        alternatePhone: body.alternatePhone !== undefined ? body.alternatePhone : undefined,
        address: body.address !== undefined ? body.address : undefined,
        city: body.city !== undefined ? body.city : undefined,
        state: body.state !== undefined ? body.state : undefined,
        pincode: body.pincode !== undefined ? body.pincode : undefined,
        source: body.source || undefined,
        campaign: body.campaign !== undefined ? body.campaign : undefined,
        customerRequirement: body.customerRequirement !== undefined ? body.customerRequirement : undefined,
        status: body.status || undefined,
        priority: body.priority || undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
        assignedToId: body.assignedToId !== undefined ? body.assignedToId : undefined,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Log activities for changed fields
    if (oldLead) {
      if (oldLead.status !== body.status && body.status) {
        await prisma.activityHistory.create({
          data: {
            leadId: params.id,
            userId,
            action: 'status_changed',
            fieldName: 'status',
            oldValue: oldLead.status,
            newValue: body.status,
            description: `Lead status changed from ${oldLead.status} to ${body.status}`,
          },
        });
      }

      if (oldLead.assignedToId !== body.assignedToId && body.assignedToId !== undefined) {
        await prisma.activityHistory.create({
          data: {
            leadId: params.id,
            userId,
            action: 'assigned',
            fieldName: 'assignedToId',
            oldValue: oldLead.assignedToId || 'unassigned',
            newValue: body.assignedToId || 'unassigned',
            description: `Lead reassigned`,
          },
        });
      }
    }

    return NextResponse.json({ success: true, data: lead });
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update lead' },
      { status: 500 }
    );
  }
}

// DELETE lead
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Delete related records first
    await Promise.all([
      prisma.callLog.deleteMany({ where: { leadId: params.id } }),
      prisma.followUp.deleteMany({ where: { leadId: params.id } }),
      prisma.activityHistory.deleteMany({ where: { leadId: params.id } }),
    ]);

    // Delete the lead
    await prisma.lead.delete({ where: { id: params.id } });

    return NextResponse.json(
      { success: true, message: 'Lead deleted successfully' }
    );
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete lead' },
      { status: 500 }
    );
  }
}
