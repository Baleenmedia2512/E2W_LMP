import { z } from 'zod';

// Lead validations
export const createLeadSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  email: z.string().email('Invalid email').optional().nullable(),
  alternatePhone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
    .optional()
    .nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  pincode: z.string().max(10).optional().nullable(),
  source: z.string().min(1, 'Source is required'),
  campaign: z.string().optional().nullable(),
  status: z.enum(['new', 'followup', 'unreach', 'unqualified']).default('new'),
  assignedToId: z.string().cuid().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export const updateLeadSchema = createLeadSchema.partial();

export const assignLeadSchema = z.object({
  leadId: z.string().cuid(),
  assignedToId: z.string().cuid(),
  reason: z.string().optional().nullable(),
});

// Call log validations
export const createCallLogSchema = z.object({
  leadId: z.string().cuid(),
  startedAt: z.string().datetime().or(z.date()),
  endedAt: z.string().datetime().or(z.date()).optional().nullable(),
  remarks: z.string().max(2000).optional().nullable(),
  callStatus: z.enum(['answered', 'not_answered', 'busy', 'invalid']).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

// Follow-up validations
export const createFollowUpSchema = z.object({
  leadId: z.string().cuid(),
  scheduledAt: z.string().datetime().or(z.date()),
  customerRequirement: z.string().min(1, 'Remarks is required').max(500, 'Remarks must be less than 500 characters'),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateFollowUpSchema = z.object({
  scheduledAt: z.string().datetime().or(z.date()).optional(),
  customerRequirement: z.string().max(500).optional(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(['pending', 'cancelled']).optional(),
});

// DSR export validations
export const dsrExportSchema = z.object({
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()),
  exportType: z.enum(['individual', 'team']),
  userId: z.string().cuid().optional(),
});

// Pagination validations
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

// Search and filter validations
export const leadFilterSchema = z.object({
  status: z.enum(['new', 'followup', 'unreach', 'unqualified']).optional(),
  source: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assignedToId: z.string().optional(), // Can be CUID or 'null' string
  createdById: z.string().cuid().optional(),
  search: z.string().optional(),
  startDate: z.string().datetime().or(z.date()).optional(),
  endDate: z.string().datetime().or(z.date()).optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type AssignLeadInput = z.infer<typeof assignLeadSchema>;
export type CreateCallLogInput = z.infer<typeof createCallLogSchema>;
export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>;
export type DSRExportInput = z.infer<typeof dsrExportSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type LeadFilterInput = z.infer<typeof leadFilterSchema>;




