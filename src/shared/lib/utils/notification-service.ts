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
 * Create notification for follow-up due soon
 */
export async function notifyFollowUpDue(
  leadId: string,
  leadName: string,
  assignedToId: string,
  scheduledAt: Date
) {
  return createNotification({
    userId: assignedToId,
    type: 'info',
    title: '⏰ Follow-up Due',
    message: `You have a follow-up scheduled with "${leadName}".`,
    relatedLeadId: leadId,
    metadata: { 
      action: 'FOLLOWUP_DUE',
      scheduledAt: scheduledAt.toISOString(),
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
