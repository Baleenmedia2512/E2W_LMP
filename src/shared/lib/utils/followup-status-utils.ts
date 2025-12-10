/**
 * Follow-up Status Management Utilities
 * 
 * This module provides utilities for managing follow-up status changes
 * and determining when to trigger notifications.
 */

export type FollowUpStatus = 'pending' | 'completed' | 'overdue' | 'cancelled';
export type LeadStatus = 'new' | 'followup' | 'qualified' | 'unreach' | 'unqualified' | 'won' | 'lost';

export interface FollowUpStatusChange {
  oldStatus: FollowUpStatus;
  newStatus: FollowUpStatus;
  shouldNotify: boolean;
  notificationType: 'info' | 'success' | 'warning' | 'error';
}

export interface LeadStageChange {
  oldStage: LeadStatus;
  newStage: LeadStatus;
  isFollowUpRelated: boolean;
  shouldNotify: boolean;
  notificationType: 'info' | 'success' | 'warning' | 'error';
}

/**
 * Determines if a follow-up status change should trigger a notification
 */
export function shouldNotifyFollowUpStatusChange(
  oldStatus: FollowUpStatus,
  newStatus: FollowUpStatus
): FollowUpStatusChange {
  const change: FollowUpStatusChange = {
    oldStatus,
    newStatus,
    shouldNotify: false,
    notificationType: 'info',
  };

  if (oldStatus === newStatus) {
    return change;
  }

  const notificationRules: Record<string, { notify: boolean; type: 'info' | 'success' | 'warning' | 'error' }> = {
    'pending_to_completed': { notify: true, type: 'success' },
    'pending_to_overdue': { notify: true, type: 'warning' },
    'pending_to_cancelled': { notify: true, type: 'info' },
    'overdue_to_completed': { notify: true, type: 'success' },
    'overdue_to_pending': { notify: true, type: 'info' },
    'overdue_to_cancelled': { notify: true, type: 'info' },
    'completed_to_pending': { notify: true, type: 'info' },
    'completed_to_overdue': { notify: true, type: 'warning' },
    'cancelled_to_pending': { notify: true, type: 'info' },
    'cancelled_to_completed': { notify: true, type: 'success' },
  };

  const ruleKey = `${oldStatus}_to_${newStatus}`;
  const rule = notificationRules[ruleKey];

  if (rule) {
    change.shouldNotify = rule.notify;
    change.notificationType = rule.type;
  }

  return change;
}

/**
 * Determines if a lead stage change should trigger a notification
 */
export function shouldNotifyLeadStageChange(
  oldStage: LeadStatus,
  newStage: LeadStatus
): LeadStageChange {
  const change: LeadStageChange = {
    oldStage,
    newStage,
    isFollowUpRelated: false,
    shouldNotify: false,
    notificationType: 'info',
  };

  if (oldStage === newStage) {
    return change;
  }

  const followUpRelatedStages: LeadStatus[] = ['new', 'followup', 'qualified', 'won', 'lost', 'unqualified', 'unreach'];
  change.isFollowUpRelated = 
    followUpRelatedStages.includes(oldStage) && 
    followUpRelatedStages.includes(newStage) &&
    (oldStage === 'followup' || newStage === 'followup' || 
     (oldStage === 'new' && (newStage as LeadStatus) === 'followup'));

  if (!change.isFollowUpRelated) {
    return change;
  }

  const notificationRules: Record<string, { notify: boolean; type: 'info' | 'success' | 'warning' | 'error' }> = {
    'new_to_followup': { notify: true, type: 'info' },
    'followup_to_qualified': { notify: true, type: 'success' },
    'followup_to_won': { notify: true, type: 'success' },
    'followup_to_lost': { notify: true, type: 'warning' },
    'followup_to_unqualified': { notify: true, type: 'warning' },
    'followup_to_unreach': { notify: true, type: 'warning' },
    'qualified_to_followup': { notify: true, type: 'info' },
    'new_to_qualified': { notify: false, type: 'info' },
    'qualified_to_won': { notify: false, type: 'success' },
    'qualified_to_lost': { notify: false, type: 'warning' },
  };

  const ruleKey = `${oldStage}_to_${newStage}`;
  const rule = notificationRules[ruleKey];

  if (rule) {
    change.shouldNotify = rule.notify;
    change.notificationType = rule.type;
  }

  return change;
}

/**
 * Determines the appropriate follow-up status based on scheduled date
 */
export function determineFollowUpStatus(
  scheduledAt: Date,
  completedAt?: Date | null,
  currentStatus?: FollowUpStatus
): FollowUpStatus {
  if (completedAt) {
    return 'completed';
  }

  if (currentStatus === 'cancelled') {
    return 'cancelled';
  }

  const now = new Date();
  
  if (scheduledAt < now) {
    return 'overdue';
  }

  return 'pending';
}

/**
 * Formats status change message for activity logs
 */
export function formatStatusChangeMessage(
  entityType: 'followup' | 'lead',
  fieldName: string,
  oldValue: string,
  newValue: string,
  entityName?: string
): string {
  const entity = entityType === 'followup' ? 'Follow-up' : 'Lead';
  const nameContext = entityName ? ` for ${entityName}` : '';
  
  return `${entity} ${fieldName} changed from ${oldValue} to ${newValue}${nameContext}`;
}

/**
 * Check if a follow-up is overdue based on its scheduled date
 */
export function isFollowUpOverdue(scheduledAt: Date): boolean {
  return new Date() > scheduledAt;
}

/**
 * Calculate how many days a follow-up is overdue
 */
export function calculateOverdueDays(scheduledAt: Date): number {
  const now = new Date();
  const diffTime = now.getTime() - scheduledAt.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
