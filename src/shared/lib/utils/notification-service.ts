/**
 * Notification Service
 * Centralized service for creating system notifications
 * 
 * REAL-TIME NOTIFICATION SYSTEM
 * =============================
 * 
 * This service implements a comprehensive real-time notification system that triggers
 * notifications for ALL status changes and important activities in the system.
 * 
 * TRIGGER CONDITIONS:
 * ------------------
 * 
 * 1. LEAD STATUS CHANGES (All status transitions trigger notifications):
 *    - New → Follow-up
 *    - Follow-up → Overdue
 *    - Overdue → Follow-up
 *    - Follow-up → Rescheduled
 *    - Any → Won
 *    - Any → Lost
 *    - Any → Unreachable
 *    - Any → Unqualified
 *    - Any → Closed
 *    - Any → Any (Universal status change notification)
 * 
 * 2. OVERDUE REMINDERS:
 *    - Before follow-up becomes overdue (15 minutes - 1 hour advance warning)
 *    - When follow-up crosses scheduled time and becomes overdue
 * 
 * 3. RESCHEDULE EVENTS:
 *    - When user reschedules a follow-up to new time
 * 
 * 4. ACTIVITY-BASED NOTIFICATIONS:
 *    - Call Completed
 *    - Call Log Submitted
 *    - Follow-up Added
 *    - Follow-up Updated
 *    - New Lead Assigned
 *    - Lead Converted
 *    - Lead Reopened
 *    - Note Added to Lead
 *    - Tag Updated
 *    - Phone/Email/Info Updated
 * 
 * NOTIFICATION TYPES:
 * ------------------
 * - info: General updates and informational messages
 * - success: Completed actions (won lead, call completed, etc.)
 * - warning: Overdue soon, unreachable, lost leads
 * - error: Missed, failed, or critical updates
 * 
 * DISPLAY FORMAT:
 * --------------
 * Each notification includes:
 * - title: Short descriptive title with emoji
 * - message: Detailed description of the event
 * - type: Visual indicator (info/success/warning/error)
 * - timestamp: When the notification was created
 * - isRead: Read/unread status
 * - relatedLeadId: Link to the related lead (if applicable)
 * 
 * REAL-TIME DELIVERY:
 * ------------------
 * - Notifications appear instantly via 10-second polling
 * - Toast notifications for new unread notifications
 * - Bell icon with unread count badge
 * - Notification dropdown with full list
 * - Mark as read functionality
 * - Clear all functionality
 * - Notification Center page for full history
 * 
 * CRON JOBS:
 * ---------
 * - check-overdue-followups: Runs every hour to mark pending follow-ups as overdue
 * - check-upcoming-followups: Runs every 15 minutes to send advance warnings
 */

import prisma from '@/shared/lib/db/prisma';
import crypto from 'crypto';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedLeadId?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    return await prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        relatedLeadId: params.relatedLeadId,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
}

/**
 * Create notification for new lead assignment
 */
export async function notifyLeadAssigned(leadId: string, leadName: string, assignedToId: string, assignedByName?: string) {
  // Fetch the assigned user's name to include in the message
  const assignedToUser = await prisma.user.findUnique({
    where: { id: assignedToId },
    select: { name: true },
  });
  
  const assignedToName = assignedToUser?.name || 'Unknown User';
  
  const message = assignedByName 
    ? `${assignedByName} assigned ${leadName} to ${assignedToName}`
    : `Lead "${leadName}" has been assigned to ${assignedToName}.`;
  
  return createNotification({
    userId: assignedToId,
    type: 'info',
    title: '📋 New Lead Assigned',
    message,
    relatedLeadId: leadId,
    metadata: { action: 'LEAD_ASSIGNED', assignedBy: assignedByName, assignedTo: assignedToName },
  });
}

/**
 * Create notification for deal won
 */
export async function notifyDealWon(leadId: string, leadName: string, assignedToId: string) {
  return createNotification({
    userId: assignedToId,
    type: 'success',
    title: '🎉 Deal Closed - Won!',
    message: `Congratulations! The deal with "${leadName}" has been won.`,
    relatedLeadId: leadId,
    metadata: { action: 'DEAL_WON' },
  });
}

/**
 * Create notification for status change to Unreachable
 */
export async function notifyLeadUnreachable(leadId: string, leadName: string, assignedToId: string) {
  return createNotification({
    userId: assignedToId,
    type: 'warning',
    title: '⚠️ Lead Marked Unreachable',
    message: `Lead "${leadName}" has been marked as unreachable.`,
    relatedLeadId: leadId,
    metadata: { action: 'LEAD_UNREACHABLE' },
  });
}

/**
 * Create notification for status change to Unqualified
 */
export async function notifyLeadUnqualified(leadId: string, leadName: string, assignedToId: string) {
  return createNotification({
    userId: assignedToId,
    type: 'warning',
    title: '❌ Lead Marked Unqualified',
    message: `Lead "${leadName}" has been marked as unqualified.`,
    relatedLeadId: leadId,
    metadata: { action: 'LEAD_UNQUALIFIED' },
  });
}

/**
 * Create notification for status change to Lost
 */
export async function notifyLeadLost(leadId: string, leadName: string, assignedToId: string) {
  return createNotification({
    userId: assignedToId,
    type: 'warning',
    title: '📝 Lead Marked Lost',
    message: `Lead "${leadName}" has been marked as lost.`,
    relatedLeadId: leadId,
    metadata: { action: 'LEAD_LOST' },
  });
}

/**
 * Create notification for follow-up due soon
 */
export async function notifyFollowUpDue(
  leadId: string,
  leadName: string,
  assignedToId: string,
  scheduledAt: Date
) {
  const now = new Date();
  const hoursUntilDue = (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isTomorrow = scheduledAt.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
  
  let title, message;
  
  if (isTomorrow) {
    title = '📅 Follow-up Scheduled for Tomorrow';
    message = `Follow-up with "${leadName}" is scheduled for tomorrow at ${scheduledAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}.`;
  } else if (hoursUntilDue <= 1) {
    title = '🔔 Follow-up Due Soon';
    message = `You have a follow-up scheduled with "${leadName}" in less than 1 hour.`;
  } else {
    title = '⏰ Follow-up Due';
    message = `You have a follow-up scheduled with "${leadName}".`;
  }

  return createNotification({
    userId: assignedToId,
    type: 'info',
    title,
    message,
    relatedLeadId: leadId,
    metadata: { 
      action: 'FOLLOWUP_DUE',
      scheduledAt: scheduledAt.toISOString(),
      hoursUntilDue: Math.round(hoursUntilDue * 10) / 10, // Round to 1 decimal place
      isTomorrow,
    },
  });
}

/**
 * Create notification for follow-up overdue
 */
export async function notifyFollowUpOverdue(
  leadId: string,
  leadName: string,
  assignedToId: string,
  priority: string = 'medium'
) {
  return createNotification({
    userId: assignedToId,
    type: priority === 'high' ? 'error' : 'warning',
    title: priority === 'high' ? '🔴 High Priority Follow-up Overdue!' : '⚠️ Follow-up Overdue',
    message: `Follow-up with "${leadName}" is overdue. Please take action immediately.`,
    relatedLeadId: leadId,
    metadata: { 
      action: 'FOLLOWUP_OVERDUE',
      priority,
    },
  });
}

/**
 * Create notification for follow-up rescheduled
 */
export async function notifyFollowUpRescheduled(
  leadId: string,
  leadName: string,
  assignedToId: string,
  newScheduledAt: Date
) {
  const formattedDate = newScheduledAt.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: '2-digit' 
  }).replace(/\//g, '-');
  const formattedTime = newScheduledAt.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  });

  return createNotification({
    userId: assignedToId,
    type: 'info',
    title: '📅 Follow-up Rescheduled',
    message: `Follow-up with "${leadName}" has been rescheduled to ${formattedDate} at ${formattedTime}.`,
    relatedLeadId: leadId,
    metadata: { 
      action: 'FOLLOWUP_RESCHEDULED',
      newScheduledAt: newScheduledAt.toISOString(),
    },
  });
}

/**
 * Create notification for follow-up status change
 */
export async function notifyFollowUpStatusChange(
  leadId: string,
  leadName: string,
  assignedToId: string,
  oldStatus: string,
  newStatus: string
) {
  const statusMessages: Record<string, { title: string; message: string; type: NotificationType }> = {
    'pending_to_completed': {
      title: '✅ Follow-up Completed',
      message: `Follow-up with "${leadName}" has been marked as completed.`,
      type: 'success'
    },
    'completed_to_pending': {
      title: '🔄 Follow-up Reopened',
      message: `Follow-up with "${leadName}" has been reopened and is now pending.`,
      type: 'info'
    },
    'pending_to_overdue': {
      title: '⚠️ Follow-up Now Overdue',
      message: `Follow-up with "${leadName}" is now overdue. Please take action immediately.`,
      type: 'warning'
    },
    'overdue_to_completed': {
      title: '✅ Overdue Follow-up Completed',
      message: `Overdue follow-up with "${leadName}" has been completed. Great work!`,
      type: 'success'
    },
    'overdue_to_pending': {
      title: '🔄 Overdue Follow-up Rescheduled',
      message: `Overdue follow-up with "${leadName}" has been rescheduled.`,
      type: 'info'
    }
  };

  const statusKey = `${oldStatus}_to_${newStatus}`;
  const notificationConfig = statusMessages[statusKey];

  if (!notificationConfig) {
    // Generic notification for other status changes
    return createNotification({
      userId: assignedToId,
      type: 'info',
      title: '📋 Follow-up Status Updated',
      message: `Follow-up status for "${leadName}" changed from ${oldStatus} to ${newStatus}.`,
      relatedLeadId: leadId,
      metadata: { 
        action: 'FOLLOWUP_STATUS_CHANGE',
        oldStatus,
        newStatus,
      },
    });
  }

  return createNotification({
    userId: assignedToId,
    type: notificationConfig.type,
    title: notificationConfig.title,
    message: notificationConfig.message,
    relatedLeadId: leadId,
    metadata: { 
      action: 'FOLLOWUP_STATUS_CHANGE',
      oldStatus,
      newStatus,
    },
  });
}

/**
 * Create notification for lead follow-up stage change
 */
export async function notifyLeadFollowUpStageChange(
  leadId: string,
  leadName: string,
  assignedToId: string,
  oldStatus: string,
  newStatus: string
) {
  const stageMessages: Record<string, { title: string; message: string; type: NotificationType }> = {
    'new_to_followup': {
      title: '📅 Lead Moved to Follow-up',
      message: `Lead "${leadName}" has been moved to follow-up stage.`,
      type: 'info'
    },
    'followup_to_qualified': {
      title: '🎯 Lead Qualified',
      message: `Follow-up lead "${leadName}" has been qualified!`,
      type: 'success'
    },
    'followup_to_won': {
      title: '🎉 Follow-up Lead Won!',
      message: `Follow-up lead "${leadName}" has been won! Congratulations!`,
      type: 'success'
    },
    'followup_to_lost': {
      title: '📝 Follow-up Lead Lost',
      message: `Follow-up lead "${leadName}" has been marked as lost.`,
      type: 'warning'
    },
    'followup_to_unqualified': {
      title: '❌ Follow-up Lead Unqualified',
      message: `Follow-up lead "${leadName}" has been marked as unqualified.`,
      type: 'warning'
    },
    'followup_to_unreach': {
      title: '📞 Follow-up Lead Unreachable',
      message: `Follow-up lead "${leadName}" has been marked as unreachable.`,
      type: 'warning'
    }
  };

  const stageKey = `${oldStatus}_to_${newStatus}`;
  const notificationConfig = stageMessages[stageKey];

  if (!notificationConfig) {
    // Generic notification for other stage changes
    return createNotification({
      userId: assignedToId,
      type: 'info',
      title: '🔄 Lead Stage Updated',
      message: `Lead "${leadName}" stage changed from ${oldStatus} to ${newStatus}.`,
      relatedLeadId: leadId,
      metadata: { 
        action: 'LEAD_FOLLOWUP_STAGE_CHANGE',
        oldStatus,
        newStatus,
      },
    });
  }

  return createNotification({
    userId: assignedToId,
    type: notificationConfig.type,
    title: notificationConfig.title,
    message: notificationConfig.message,
    relatedLeadId: leadId,
    metadata: { 
      action: 'LEAD_FOLLOWUP_STAGE_CHANGE',
      oldStatus,
      newStatus,
    },
  });
}

/**
 * Create notification for lead information update (phone, email, etc.)
 */
export async function notifyLeadInfoUpdated(
  leadId: string,
  leadName: string,
  assignedToId: string,
  fieldName: string,
  oldValue: string,
  newValue: string
) {
  const fieldLabels: Record<string, string> = {
    phone: '📱 Phone Number',
    email: '📧 Email',
    address: '📍 Address',
    city: '🏙️ City',
    state: '🗺️ State',
    pincode: '📮 Pincode',
    customerRequirement: '📝 Customer Requirement',
    notes: '📄 Notes',
  };

  const label = fieldLabels[fieldName] || fieldName;

  return createNotification({
    userId: assignedToId,
    type: 'info',
    title: `${label} Updated`,
    message: `${label} for lead "${leadName}" has been updated.`,
    relatedLeadId: leadId,
    metadata: { 
      action: 'LEAD_INFO_UPDATED',
      fieldName,
      oldValue,
      newValue,
    },
  });
}

/**
 * Create notification for new call logged
 */
export async function notifyCallLogged(
  leadId: string,
  leadName: string,
  assignedToId: string,
  callStatus: string,
  duration?: number
) {
  const statusEmojis: Record<string, string> = {
    answer: '✅',
    busy: '📵',
    wrong_number: '❌',
    ring_not_response: '📞',
  };

  const emoji = statusEmojis[callStatus] || '📞';
  const durationText = duration ? ` (${Math.floor(duration / 60)}m ${duration % 60}s)` : '';

  return createNotification({
    userId: assignedToId,
    type: 'info',
    title: `${emoji} Call Logged`,
    message: `A call was logged for "${leadName}"${durationText}.`,
    relatedLeadId: leadId,
    metadata: { 
      action: 'CALL_LOGGED',
      callStatus,
      duration,
    },
  });
}

/**
 * Create notification for new note added
 */
export async function notifyNoteAdded(
  leadId: string,
  leadName: string,
  assignedToId: string,
  notePreview: string
) {
  return createNotification({
    userId: assignedToId,
    type: 'info',
    title: '📝 Note Added',
    message: `A new note was added to "${leadName}": ${notePreview.substring(0, 50)}${notePreview.length > 50 ? '...' : ''}`,
    relatedLeadId: leadId,
    metadata: { 
      action: 'NOTE_ADDED',
    },
  });
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { 
      isRead: true,
      readAt: new Date(),
    },
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { 
      userId,
      isRead: false,
    },
    data: { 
      isRead: true,
      readAt: new Date(),
    },
  });
}

/**
 * Create notification for any status change
 */
export async function notifyStatusChange(
  leadId: string,
  leadName: string,
  assignedToId: string,
  oldStatus: string,
  newStatus: string
) {
  const statusConfig: Record<string, { emoji: string; type: NotificationType }> = {
    'new': { emoji: '🆕', type: 'info' },
    'followup': { emoji: '📅', type: 'info' },
    'qualified': { emoji: '🎯', type: 'success' },
    'won': { emoji: '🎉', type: 'success' },
    'lost': { emoji: '📝', type: 'warning' },
    'unreach': { emoji: '📞', type: 'warning' },
    'unqualified': { emoji: '❌', type: 'warning' },
    'closed': { emoji: '🔒', type: 'info' },
    'rescheduled': { emoji: '🔄', type: 'info' },
  };

  const oldConfig = statusConfig[oldStatus] || { emoji: '📋', type: 'info' };
  const newConfig = statusConfig[newStatus] || { emoji: '📋', type: 'info' };

  return createNotification({
    userId: assignedToId,
    type: newConfig.type,
    title: `${newConfig.emoji} Status Updated`,
    message: `Lead "${leadName}" changed from ${oldStatus} to ${newStatus}`,
    relatedLeadId: leadId,
    metadata: { 
      action: 'STATUS_CHANGE',
      oldStatus,
      newStatus,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Create notification for lead converted
 */
export async function notifyLeadConverted(
  leadId: string,
  leadName: string,
  assignedToId: string
) {
  return createNotification({
    userId: assignedToId,
    type: 'success',
    title: '🎯 Lead Converted',
    message: `Lead "${leadName}" has been successfully converted!`,
    relatedLeadId: leadId,
    metadata: { 
      action: 'LEAD_CONVERTED',
    },
  });
}

/**
 * Create notification for lead reopened
 */
export async function notifyLeadReopened(
  leadId: string,
  leadName: string,
  assignedToId: string,
  reason?: string
) {
  return createNotification({
    userId: assignedToId,
    type: 'info',
    title: '🔓 Lead Reopened',
    message: `Lead "${leadName}" has been reopened${reason ? `: ${reason}` : '.'}`,
    relatedLeadId: leadId,
    metadata: { 
      action: 'LEAD_REOPENED',
      reason,
    },
  });
}

/**
 * Create notification for tag updated
 */
export async function notifyTagUpdated(
  leadId: string,
  leadName: string,
  assignedToId: string,
  oldTags: string[],
  newTags: string[]
) {
  const added = newTags.filter(tag => !oldTags.includes(tag));
  const removed = oldTags.filter(tag => !newTags.includes(tag));
  
  let message = `Tags updated for lead "${leadName}"`;
  if (added.length > 0) message += `. Added: ${added.join(', ')}`;
  if (removed.length > 0) message += `. Removed: ${removed.join(', ')}`;

  return createNotification({
    userId: assignedToId,
    type: 'info',
    title: '🏷️ Tags Updated',
    message,
    relatedLeadId: leadId,
    metadata: { 
      action: 'TAG_UPDATED',
      oldTags,
      newTags,
      added,
      removed,
    },
  });
}

/**
 * Create notification for call completed
 */
export async function notifyCallCompleted(
  leadId: string,
  leadName: string,
  assignedToId: string,
  duration?: number,
  outcome?: string
) {
  const durationText = duration ? ` (${Math.floor(duration / 60)}m ${duration % 60}s)` : '';
  const outcomeText = outcome ? ` - ${outcome}` : '';

  return createNotification({
    userId: assignedToId,
    type: 'success',
    title: '✅ Call Completed',
    message: `Call with "${leadName}" completed${durationText}${outcomeText}`,
    relatedLeadId: leadId,
    metadata: { 
      action: 'CALL_COMPLETED',
      duration,
      outcome,
    },
  });
}

/**
 * Create notification for follow-up added
 */
export async function notifyFollowUpAdded(
  leadId: string,
  leadName: string,
  assignedToId: string,
  scheduledAt: Date
) {
  const formattedDate = scheduledAt.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: '2-digit' 
  }).replace(/\//g, '-');
  const formattedTime = scheduledAt.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  });

  return createNotification({
    userId: assignedToId,
    type: 'info',
    title: '📅 Follow-up Added',
    message: `New follow-up scheduled for "${leadName}" on ${formattedDate} at ${formattedTime}`,
    relatedLeadId: leadId,
    metadata: { 
      action: 'FOLLOWUP_ADDED',
      scheduledAt: scheduledAt.toISOString(),
    },
  });
}

/**
 * Create notification for follow-up updated
 */
export async function notifyFollowUpUpdated(
  leadId: string,
  leadName: string,
  assignedToId: string,
  changes: string
) {
  return createNotification({
    userId: assignedToId,
    type: 'info',
    title: '📝 Follow-up Updated',
    message: `Follow-up for "${leadName}" has been updated: ${changes}`,
    relatedLeadId: leadId,
    metadata: { 
      action: 'FOLLOWUP_UPDATED',
      changes,
    },
  });
}

/**
 * Create notification for call log submitted
 */
export async function notifyCallLogSubmitted(
  leadId: string,
  leadName: string,
  assignedToId: string,
  callStatus: string,
  remarks?: string
) {
  return createNotification({
    userId: assignedToId,
    type: 'info',
    title: '📞 Call Log Submitted',
    message: `Call log for "${leadName}" submitted - Status: ${callStatus}${remarks ? ` - ${remarks.substring(0, 50)}` : ''}`,
    relatedLeadId: leadId,
    metadata: { 
      action: 'CALL_LOG_SUBMITTED',
      callStatus,
      remarks,
    },
  });
}
