import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { 
  notifyLeadAssigned, 
  notifyDealWon, 
  notifyLeadUnreachable, 
  notifyLeadUnqualified 
} from '@/shared/lib/utils/notification-service';

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

    // Validate required fields
    if (body.name && body.name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Name must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (body.phone) {
      const phoneDigits = body.phone.replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        return NextResponse.json(
          { success: false, error: 'Phone number must be exactly 10 digits' },
          { status: 400 }
        );
      }
    }

    if (body.email && body.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Get old values for activity tracking
    const oldLead = await prisma.lead.findUnique({ where: { id: params.id } });

    // Prepare update data
    const updateData: any = {
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
      notes: body.notes !== undefined ? body.notes : undefined,
      assignedToId: body.assignedToId !== undefined ? body.assignedToId : undefined,
    };

    // Reset call attempts when lead status changes to won or lost (US-9 requirement)
    if (body.status && (body.status === 'won' || body.status === 'lost') && oldLead?.status !== body.status) {
      updateData.callAttempts = 0;
    }

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: updateData,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Log activities for changed fields (only if userId is provided)
    if (oldLead && body.updatedById) {
      const activityPromises = [];
      const notificationPromises = [];

      if (oldLead.status !== body.status && body.status) {
        activityPromises.push(
          prisma.activityHistory.create({
            data: {
              leadId: params.id,
              userId: body.updatedById,
              action: 'status_changed',
              fieldName: 'status',
              oldValue: oldLead.status,
              newValue: body.status,
              description: `Lead status changed from ${oldLead.status} to ${body.status}`,
            },
          })
        );

        // Send notifications based on status change
        const assignedToId = lead.assignedToId;
        if (assignedToId) {
          if (body.status === 'won') {
            notificationPromises.push(
              notifyDealWon(params.id, lead.name, assignedToId)
            );
          } else if (body.status === 'unreach') {
            notificationPromises.push(
              notifyLeadUnreachable(params.id, lead.name, assignedToId)
            );
          } else if (body.status === 'unqualified') {
            notificationPromises.push(
              notifyLeadUnqualified(params.id, lead.name, assignedToId)
            );
          }
        }
      }

      if (oldLead.assignedToId !== body.assignedToId && body.assignedToId !== undefined) {
        const previousAssignee = oldLead.assignedToId ? 
          (await prisma.user.findUnique({ where: { id: oldLead.assignedToId } }))?.name : 'Unassigned';
        const newAssignee = body.assignedToId ? 
          (await prisma.user.findUnique({ where: { id: body.assignedToId } }))?.name : 'Unassigned';
        
        activityPromises.push(
          prisma.activityHistory.create({
            data: {
              leadId: params.id,
              userId: body.updatedById,
              action: 'assigned',
              fieldName: 'assignedToId',
              oldValue: previousAssignee || 'Unassigned',
              newValue: newAssignee || 'Unassigned',
              description: `Lead ${oldLead.assignedToId ? 'reassigned' : 'assigned'} from ${previousAssignee} to ${newAssignee}`,
              metadata: {
                assignmentType: body.assignmentType || 'MANUAL',
                reason: body.assignmentReason || body.notes || null,
                timestamp: new Date().toISOString(),
              },
            },
          })
        );

        // Send notification for new assignment
        if (body.assignedToId && body.assignedToId !== oldLead.assignedToId) {
          notificationPromises.push(
            notifyLeadAssigned(params.id, lead.name, body.assignedToId)
          );
        }
      }

      // Track other important field changes
      if (oldLead.phone !== body.phone && body.phone) {
        activityPromises.push(
          prisma.activityHistory.create({
            data: {
              leadId: params.id,
              userId: body.updatedById,
              action: 'updated',
              fieldName: 'phone',
              oldValue: oldLead.phone,
              newValue: body.phone,
              description: `Phone number updated`,
            },
          })
        );
      }

      if (oldLead.email !== body.email && body.email !== undefined) {
        activityPromises.push(
          prisma.activityHistory.create({
            data: {
              leadId: params.id,
              userId: body.updatedById,
              action: 'updated',
              fieldName: 'email',
              oldValue: oldLead.email || 'none',
              newValue: body.email || 'none',
              description: `Email ${body.email ? 'updated' : 'removed'}`,
            },
          })
        );
      }

      // Execute all activity logs
      if (activityPromises.length > 0) {
        await Promise.all(activityPromises);
      }

      // Execute all notifications (non-blocking)
      if (notificationPromises.length > 0) {
        Promise.all(notificationPromises).catch(error => {
          console.error('Failed to send notifications:', error);
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
