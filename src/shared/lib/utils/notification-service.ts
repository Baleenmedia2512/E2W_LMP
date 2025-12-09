/**
 * Notification Service
 * Centralized service for creating system notifications
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
export async function notifyLeadAssigned(leadId: string, leadName: string, assignedToId: string) {
  return createNotification({
    userId: assignedToId,
    type: 'info',
    title: '📋 New Lead Assigned',
    message: `A new lead "${leadName}" has been assigned to you.`,
    relatedLeadId: leadId,
    metadata: { action: 'LEAD_ASSIGNED' },
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
