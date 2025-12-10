import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { normalizePhoneForStorage, isValidPhone } from '@/shared/utils/phone';
import { 
  notifyLeadAssigned, 
  notifyDealWon, 
  notifyLeadUnreachable, 
  notifyLeadUnqualified,
  notifyLeadLost,
  notifyLeadFollowUpStageChange,
  notifyLeadInfoUpdated,
  notifyNoteAdded,
  notifyStatusChange
} from '@/shared/lib/utils/notification-service';
import { randomUUID } from 'crypto';

// GET single lead by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        User_Lead_assignedToIdToUser: { select: { id: true, name: true, email: true } },
        User_Lead_createdByIdToUser: { select: { id: true, name: true, email: true } },
        CallLog: { orderBy: { createdAt: 'desc' }, take: 10 },
        FollowUp: { orderBy: { scheduledAt: 'desc' }, take: 10 },
      },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Transform the response to match frontend expectations
    const transformedLead = {
      ...lead,
      assignedTo: lead.User_Lead_assignedToIdToUser,
      createdBy: lead.User_Lead_createdByIdToUser,
    };

    // Remove the Prisma-generated field names
    delete (transformedLead as any).User_Lead_assignedToIdToUser;
    delete (transformedLead as any).User_Lead_createdByIdToUser;

    return NextResponse.json({ success: true, data: transformedLead });
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

    // AC-4 & AC-6: Clean and validate phone numbers
    let cleanedPhone = body.phone;
    let cleanedAltPhone = body.alternatePhone;
    
    if (body.phone) {
      cleanedPhone = normalizePhoneForStorage(body.phone);
      if (!isValidPhone(cleanedPhone)) {
        return NextResponse.json(
          { success: false, error: 'Invalid phone number' },
          { status: 400 }
        );
      }
    }
    
    if (body.alternatePhone) {
      cleanedAltPhone = normalizePhoneForStorage(body.alternatePhone);
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
      phone: cleanedPhone || undefined,
      email: body.email !== undefined ? body.email : undefined,
      alternatePhone: cleanedAltPhone !== undefined ? cleanedAltPhone : undefined,
      address: body.address !== undefined ? body.address : undefined,
      city: body.city !== undefined ? body.city : undefined,
      state: body.state !== undefined ? body.state : undefined,
      pincode: body.pincode !== undefined ? body.pincode : undefined,
      // source field is intentionally excluded - it must remain unchanged for reporting purposes
      campaign: body.campaign !== undefined ? body.campaign : undefined,
      customerRequirement: body.customerRequirement !== undefined ? body.customerRequirement : undefined,
      status: body.status || undefined,
      notes: body.notes !== undefined ? body.notes : undefined,
      assignedToId: body.assignedToId !== undefined ? body.assignedToId : undefined,
      updatedAt: new Date(), // Always update the updatedAt timestamp
    };

    // Reset call attempts when lead status changes to won or lost (US-9 requirement)
    if (body.status && (body.status === 'won' || body.status === 'lost') && oldLead?.status !== body.status) {
      updateData.callAttempts = 0;
    }

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: updateData,
      include: {
        User_Lead_assignedToIdToUser: { select: { id: true, name: true, email: true } },
        User_Lead_createdByIdToUser: { select: { id: true, name: true, email: true } },
      },
    });

    // Send notifications for status changes (regardless of updatedById)
    const notificationPromises = [];
    if (oldLead && oldLead.status !== body.status && body.status) {
      const assignedToId = lead.assignedToId;
      if (assignedToId) {
        // Send universal status change notification for ALL status changes
        notificationPromises.push(
          notifyStatusChange(params.id, lead.name, assignedToId, oldLead.status, body.status)
        );

        // Send specific notifications for important status changes
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
        } else if (body.status === 'lost') {
          notificationPromises.push(
            notifyLeadLost(params.id, lead.name, assignedToId)
          );
        }

        // Check for follow-up related stage changes
        const followupRelatedStatuses = ['new', 'followup', 'qualified', 'won', 'lost', 'unqualified', 'unreach'];
        const oldStatusInFollowupFlow = followupRelatedStatuses.includes(oldLead.status);
        const newStatusInFollowupFlow = followupRelatedStatuses.includes(body.status);

        if (oldStatusInFollowupFlow && newStatusInFollowupFlow && 
            (oldLead.status === 'followup' || body.status === 'followup' || 
             oldLead.status === 'new' && body.status === 'followup')) {
          notificationPromises.push(
            notifyLeadFollowUpStageChange(
              params.id,
              lead.name,
              assignedToId,
              oldLead.status,
              body.status
            )
          );
        }
      }
    }

    // Log activities for changed fields (only if userId is provided)
    if (oldLead && body.updatedById) {
      const activityPromises = [];

      if (oldLead.status !== body.status && body.status) {
        activityPromises.push(
          prisma.activityHistory.create({
            data: {
              id: randomUUID(),
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
      }

      // Check if assignedToId is actually changing (not just a status update)
      if (body.assignedToId !== undefined && oldLead.assignedToId !== body.assignedToId) {
        const previousAssignee = oldLead.assignedToId ? 
          (await prisma.user.findUnique({ where: { id: oldLead.assignedToId } }))?.name : 'Unassigned';
        const newAssignee = body.assignedToId ? 
          (await prisma.user.findUnique({ where: { id: body.assignedToId } }))?.name : 'Unassigned';
        
        activityPromises.push(
          prisma.activityHistory.create({
            data: {
              id: randomUUID(),
              leadId: params.id,
              userId: body.updatedById,
              action: 'assigned',
              fieldName: 'assignedToId',
              oldValue: previousAssignee || 'Unassigned',
              newValue: newAssignee || 'Unassigned',
              description: `Lead ${oldLead.assignedToId ? 'reassigned' : 'assigned'} from ${previousAssignee} to ${newAssignee}`,
              metadata: JSON.stringify({
                assignmentType: body.assignmentType || 'MANUAL',
                reason: body.assignmentReason || body.notes || null,
                timestamp: new Date().toISOString(),
              }),
            },
          })
        );

        // Send notification ONLY when assignedToId is explicitly being changed to a new user
        // Don't send notification if unassigning (body.assignedToId is null/empty)
        if (body.assignedToId) {
          const assignerName = body.updatedById ? 
            (await prisma.user.findUnique({ where: { id: body.updatedById } }))?.name : undefined;
          notificationPromises.push(
            notifyLeadAssigned(params.id, lead.name, body.assignedToId, assignerName)
          );
        }
      }

      // Track other important field changes
      if (oldLead.phone !== body.phone && body.phone) {
        activityPromises.push(
          prisma.activityHistory.create({
            data: {
              id: randomUUID(),
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

        // Send notification for phone update
        if (lead.assignedToId) {
          notificationPromises.push(
            notifyLeadInfoUpdated(params.id, lead.name, lead.assignedToId, 'phone', oldLead.phone, body.phone)
          );
        }
      }

      if (oldLead.email !== body.email && body.email !== undefined) {
        activityPromises.push(
          prisma.activityHistory.create({
            data: {
              id: randomUUID(),
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

        // Send notification for email update
        if (lead.assignedToId && body.email) {
          notificationPromises.push(
            notifyLeadInfoUpdated(params.id, lead.name, lead.assignedToId, 'email', oldLead.email || 'none', body.email)
          );
        }
      }

      // Track customer requirement changes
      if (oldLead.customerRequirement !== body.customerRequirement && body.customerRequirement !== undefined) {
        activityPromises.push(
          prisma.activityHistory.create({
            data: {
              id: randomUUID(),
              leadId: params.id,
              userId: body.updatedById,
              action: 'updated',
              fieldName: 'customerRequirement',
              oldValue: oldLead.customerRequirement || 'none',
              newValue: body.customerRequirement || 'none',
              description: `Customer requirement ${body.customerRequirement ? 'updated' : 'removed'}`,
            },
          })
        );

        // Send notification for customer requirement update
        if (lead.assignedToId && body.customerRequirement) {
          notificationPromises.push(
            notifyLeadInfoUpdated(params.id, lead.name, lead.assignedToId, 'customerRequirement', oldLead.customerRequirement || 'none', body.customerRequirement)
          );
        }
      }

      // Track notes changes
      if (oldLead.notes !== body.notes && body.notes !== undefined && body.notes) {
        activityPromises.push(
          prisma.activityHistory.create({
            data: {
              id: randomUUID(),
              leadId: params.id,
              userId: body.updatedById,
              action: 'updated',
              fieldName: 'notes',
              oldValue: oldLead.notes || 'none',
              newValue: body.notes,
              description: `Notes ${oldLead.notes ? 'updated' : 'added'}`,
            },
          })
        );

        // Send notification for notes added/updated
        if (lead.assignedToId) {
          notificationPromises.push(
            notifyNoteAdded(params.id, lead.name, lead.assignedToId, body.notes)
          );
        }
      }

      // Execute all activity logs
      if (activityPromises.length > 0) {
        await Promise.all(activityPromises);
      }
    }

    // Execute all notifications (non-blocking) - moved outside updatedById check
    if (notificationPromises.length > 0) {
      Promise.all(notificationPromises).catch(error => {
        console.error('Failed to send notifications:', error);
      });
    }

    // Transform the response to match frontend expectations
    const transformedLead = {
      ...lead,
      assignedTo: lead.User_Lead_assignedToIdToUser,
      createdBy: lead.User_Lead_createdByIdToUser,
    };

    // Remove the Prisma-generated field names
    delete (transformedLead as any).User_Lead_assignedToIdToUser;
    delete (transformedLead as any).User_Lead_createdByIdToUser;

    return NextResponse.json({ success: true, data: transformedLead });
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
