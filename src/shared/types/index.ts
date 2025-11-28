export interface Role {
  id: string;
  name: 'Agent' | 'SuperAgent' | 'Finance' | 'HR' | 'Procurement';
  description: string | null;
  permissions: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  googleId: string | null;
  roleId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  role?: Role;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  alternatePhone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  source: string;
  campaign: string | null;
  customerRequirement: string | null;
  status: 'new' | 'followup' | 'unreach' | 'unqualified';
  priority: 'low' | 'medium' | 'high';
  assignedToId: string | null;
  createdById: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: User;
  createdBy?: User;
}

export interface CallLog {
  id: string;
  leadId: string;
  callerId: string;
  startedAt: Date;
  endedAt: Date | null;
  duration: number | null;
  remarks: string | null;
  callStatus: string | null;
  attemptNumber: number;
  recordingUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  lead?: Lead;
  caller?: User;
}

export interface FollowUp {
  id: string;
  leadId: string;
  scheduledAt: Date;
  completedAt: Date | null;
  notes: string | null;
  status: 'pending' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  lead?: Lead;
  createdBy?: User;
}

export interface Assignment {
  id: string;
  leadId: string;
  assignedToId: string;
  assignedById: string;
  assignmentType: 'auto' | 'manual';
  reason: string | null;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  readAt: Date | null;
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  targetType: string;
  targetId: string;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface UndoLog {
  id: string;
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  previousState: Record<string, unknown>;
  canUndo: boolean;
  undoneAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

export interface DashboardStats {
  newLeadsToday: number;
  followUpsDue: number;
  callsToday: number;
  conversionsToday: number;
  totalLeads: number;
  assignedLeads: number;
}

export interface DSRData {
  userId: string;
  userName: string;
  date: Date;
  totalCalls: number;
  totalAttempts: number;
  leadsContacted: number;
  leadsQualified: number;
  leadsConverted: number;
  followUpsScheduled: number;
  followUpsCompleted: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}




