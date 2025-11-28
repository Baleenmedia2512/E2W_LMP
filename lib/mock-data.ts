// Mock data for UI-only version with reactive state management

// Helper to generate unique IDs
let idCounter = 1000;
export const generateId = (): string => {
  idCounter += 1;
  return idCounter.toString();
};

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
  status: 'new' | 'followup' | 'unreach' | 'unqualified' | 'contacted' | 'qualified' | 'won' | 'lost';
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
  notes: string | null;
  callAttempts?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: {
    id: string;
    name: 'Agent' | 'SuperAgent' | 'Finance' | 'HR' | 'Procurement' | 'ADMIN' | 'TEAM_LEAD';
    description: string | null;
  };
  avatar?: string;
  isActive: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
}

export interface CallLog {
  id: string;
  leadId: string;
  leadName: string;
  duration: number;
  status: 'completed' | 'busy' | 'ring_not_response';
  notes: string;
  createdAt: Date;
  userId?: string;
  userName?: string;
}

export interface FollowUp {
  id: string;
  leadId: string;
  leadName: string;
  scheduledFor: Date;
  status: 'pending' | 'completed' | 'cancelled';
  notes: string;
  createdAt: Date;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date; // For follow-up scheduling
}

// Mock Users
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: {
      id: 'role-1',
      name: 'ADMIN',
      description: 'Administrator',
    },
    isActive: true,
  },
  {
    id: '2',
    name: 'John Doe',
    email: 'john@example.com',
    role: {
      id: 'role-2',
      name: 'Agent',
      description: 'Sales Agent',
    },
    isActive: true,
  },
  {
    id: '3',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: {
      id: 'role-3',
      name: 'TEAM_LEAD',
      description: 'Team Lead',
    },
    isActive: true,
  },
  {
    id: '4',
    name: 'Mike Johnson',
    email: 'mike@example.com',
    role: {
      id: 'role-4',
      name: 'SuperAgent',
      description: 'Super Agent',
    },
    isActive: true,
  },
  {
    id: '5',
    name: 'Sarah Williams',
    email: 'sarah@example.com',
    role: {
      id: 'role-2',
      name: 'Agent',
      description: 'Sales Agent',
    },
    isActive: true,
  },
  {
    id: '6',
    name: 'Tom Brown',
    email: 'tom@example.com',
    role: {
      id: 'role-4',
      name: 'SuperAgent',
      description: 'Super Agent',
    },
    isActive: true,
  },
];

// Mock Leads
export const mockLeads: Lead[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@company.com',
    phone: '+1234567890',
    alternatePhone: null,
    address: '123 Tech Street',
    city: 'San Francisco',
    state: 'CA',
    pincode: '94105',
    status: 'new',
    source: 'Website',
    campaign: 'Summer Campaign 2024',
    assignedTo: {
      id: '2',
      name: 'John Doe',
      email: 'john@example.com',
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    notes: 'Interested in product demo',
    callAttempts: 0,
  },
  {
    id: '2',
    name: 'Bob Williams',
    email: 'bob@startup.io',
    phone: '+1234567891',
    alternatePhone: '+1234567899',
    address: '456 Innovation Ave',
    city: 'Austin',
    state: 'TX',
    pincode: '78701',
    status: 'followup',
    source: 'Meta',
    campaign: 'Facebook Ad Campaign',
    assignedTo: {
      id: '3',
      name: 'Jane Smith',
      email: 'jane@example.com',
    },
    createdAt: new Date('2024-01-14'),
    updatedAt: new Date('2024-01-16'),
    notes: 'Interested in our services. Needs pricing details.',
    callAttempts: 2,
  },
  {
    id: '3',
    name: 'Carol Davis',
    email: 'carol@business.com',
    phone: '+1234567892',
    alternatePhone: null,
    address: '789 Business Blvd',
    city: 'New York',
    state: 'NY',
    pincode: '10001',
    status: 'followup',
    source: 'Referral',
    campaign: null,
    assignedTo: {
      id: '2',
      name: 'John Doe',
      email: 'john@example.com',
    },
    createdAt: new Date('2024-01-13'),
    updatedAt: new Date('2024-01-17'),
    notes: 'Ready to proceed with demo. Budget approved.',
    callAttempts: 3,
  },
  {
    id: '4',
    name: 'David Brown',
    email: 'david@enterprise.com',
    phone: '+1234567893',
    alternatePhone: null,
    address: '321 Enterprise Way',
    city: 'Boston',
    state: 'MA',
    pincode: '02101',
    status: 'won',
    source: 'Website',
    campaign: 'Email Campaign Q1',
    assignedTo: {
      id: '3',
      name: 'Jane Smith',
      email: 'jane@example.com',
    },
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-18'),
    notes: 'Deal closed - $50k contract. Payment scheduled.',
    callAttempts: 5,
  },
  {
    id: '5',
    name: 'Eve Martinez',
    email: 'eve@company.org',
    phone: '+1234567894',
    alternatePhone: '+1234567898',
    address: '654 Marketing Lane',
    city: 'Miami',
    state: 'FL',
    pincode: '33101',
    status: 'unreach',
    source: 'Direct',
    campaign: null,
    assignedTo: {
      id: '2',
      name: 'John Doe',
      email: 'john@example.com',
    },
    createdAt: new Date('2024-01-11'),
    updatedAt: new Date('2024-01-19'),
    notes: 'Multiple attempts, no response. Try again next week.',
    callAttempts: 6,
  },
  {
    id: '6',
    name: 'Frank Wilson',
    email: 'frank@tech.com',
    phone: '+1234567895',
    alternatePhone: null,
    address: null,
    city: 'Seattle',
    state: 'WA',
    pincode: '98101',
    status: 'followup',
    source: 'Website',
    campaign: 'Google Ads Campaign',
    assignedTo: {
      id: '3',
      name: 'Jane Smith',
      email: 'jane@example.com',
    },
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
    notes: null,
    callAttempts: 0,
  },
  {
    id: '7',
    name: 'Grace Lee',
    email: 'grace@startup.io',
    phone: '+1234567896',
    alternatePhone: null,
    address: '987 Startup St',
    city: 'Denver',
    state: 'CO',
    pincode: '80201',
    status: 'followup',
    source: 'Meta',
    campaign: 'Instagram Campaign',
    assignedTo: {
      id: '2',
      name: 'John Doe',
      email: 'john@example.com',
    },
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-20'),
    notes: 'Interested, need to follow up with proposal',
    callAttempts: 1,
  },
  {
    id: '8',
    name: 'Henry Carter',
    email: 'henry@corp.com',
    phone: '+1234567897',
    alternatePhone: '+1234567800',
    address: '111 Corporate Plaza',
    city: 'Chicago',
    state: 'IL',
    pincode: '60601',
    status: 'lost',
    source: 'Referral',
    campaign: null,
    assignedTo: {
      id: '3',
      name: 'Jane Smith',
      email: 'jane@example.com',
    },
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-15'),
    notes: 'Went with competitor. Price was issue.',
    callAttempts: 4,
  },
  {
    id: '9',
    name: 'Ivy Chen',
    email: 'ivy@tech-corp.com',
    phone: '+1234567810',
    alternatePhone: null,
    address: '222 Silicon Valley Dr',
    city: 'San Jose',
    state: 'CA',
    pincode: '95110',
    status: 'new',
    source: 'Website',
    campaign: null,
    assignedTo: {
      id: '4',
      name: 'Mike Johnson',
      email: 'mike@example.com',
    },
    createdAt: new Date('2024-01-22'),
    updatedAt: new Date('2024-01-22'),
    notes: null,
    callAttempts: 0,
  },
  {
    id: '10',
    name: 'Jack Robinson',
    email: null,
    phone: '+1234567811',
    alternatePhone: null,
    address: null,
    city: null,
    state: null,
    pincode: null,
    status: 'unqualified',
    source: 'WhatsApp',
    campaign: null,
    assignedTo: {
      id: '2',
      name: 'John Doe',
      email: 'john@example.com',
    },
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-19'),
    notes: 'Not interested. Budget constraints.',
    callAttempts: 2,
  },
  {
    id: '11',
    name: 'Karen Smith',
    email: 'karen@techstart.com',
    phone: '+1234567812',
    alternatePhone: null,
    address: '333 Startup Lane',
    city: 'Portland',
    state: 'OR',
    pincode: '97201',
    status: 'new',
    source: 'Website',
    campaign: 'SEO Campaign',
    assignedTo: {
      id: '2',
      name: 'John Doe',
      email: 'john@example.com',
    },
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
    notes: 'Interested in enterprise package',
    callAttempts: 0,
  },
  {
    id: '12',
    name: 'Leo Martinez',
    email: 'leo@solutions.com',
    phone: '+1234567813',
    alternatePhone: null,
    address: '444 Business Park',
    city: 'Phoenix',
    state: 'AZ',
    pincode: '85001',
    status: 'new',
    source: 'Referral',
    campaign: null,
    assignedTo: {
      id: '3',
      name: 'Jane Smith',
      email: 'jane@example.com',
    },
    createdAt: new Date('2024-01-23'),
    updatedAt: new Date('2024-01-23'),
    notes: null,
    callAttempts: 0,
  },
];

// Mock Notifications
export const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'New Lead Assigned',
    message: 'You have been assigned a new lead: Alice Johnson',
    type: 'info',
    read: false,
    createdAt: new Date('2024-01-20T10:30:00'),
  },
  {
    id: '2',
    title: 'Follow-up Due',
    message: 'Follow-up scheduled with Bob Williams is due today',
    type: 'warning',
    read: false,
    createdAt: new Date('2024-01-20T09:00:00'),
  },
  {
    id: '3',
    title: 'Deal Closed',
    message: 'Congratulations! Deal with David Brown has been closed',
    type: 'success',
    read: true,
    createdAt: new Date('2024-01-19T16:45:00'),
  },
];

// Mock Call Logs
export const mockCallLogs: CallLog[] = [
  {
    id: '1',
    leadId: '2',
    leadName: 'Bob Williams',
    duration: 360,
    status: 'completed',
    notes: 'Discussed product features and pricing',
    createdAt: new Date('2024-01-20T14:30:00'),
    userId: '2',
    userName: 'John Doe',
  },
  {
    id: '2',
    leadId: '3',
    leadName: 'Carol Davis',
    duration: 180,
    status: 'completed',
    notes: 'Scheduled demo for next week',
    createdAt: new Date('2024-01-20T11:15:00'),
    userId: '3',
    userName: 'Jane Smith',
  },
  {
    id: '3',
    leadId: '5',
    leadName: 'Eve Martinez',
    duration: 0,
    status: 'ring_not_response',
    notes: 'No answer, ring not response',
    createdAt: new Date('2024-01-19T15:00:00'),
    userId: '2',
    userName: 'John Doe',
  },
  {
    id: '4',
    leadId: '7',
    leadName: 'Grace Lee',
    duration: 240,
    status: 'completed',
    notes: 'Very interested, sending proposal',
    createdAt: new Date('2024-01-20T16:00:00'),
    userId: '2',
    userName: 'John Doe',
  },
  {
    id: '5',
    leadId: '1',
    leadName: 'Alice Johnson',
    duration: 0,
    status: 'busy',
    notes: 'Line was busy',
    createdAt: new Date('2024-01-19T10:30:00'),
    userId: '3',
    userName: 'Jane Smith',
  },
];

// Mock Follow-ups
export const mockFollowUps: FollowUp[] = [
  // Overdue follow-ups
  {
    id: '1',
    leadId: '2',
    leadName: 'Bob Williams',
    scheduledFor: new Date('2024-01-22T10:00:00'),
    dueDate: new Date('2024-01-18T10:00:00'), // 4 days overdue
    status: 'pending',
    notes: 'Send pricing proposal - URGENT',
    createdAt: new Date('2024-01-15'),
    priority: 'high',
  },
  {
    id: '3',
    leadId: '3',
    leadName: 'Carol Davis',
    scheduledFor: new Date('2024-01-21T09:30:00'),
    dueDate: new Date('2024-01-19T09:30:00'), // 3 days overdue
    status: 'pending',
    notes: 'Product demo - Already approved budget',
    createdAt: new Date('2024-01-16'),
    priority: 'high',
  },
  {
    id: '6',
    leadId: '7',
    leadName: 'Grace Lee',
    scheduledFor: new Date('2024-01-24T15:30:00'),
    dueDate: new Date('2024-01-21T15:30:00'), // 1 day overdue
    status: 'pending',
    notes: 'Follow up on proposal sent last week',
    createdAt: new Date('2024-01-18'),
    priority: 'medium',
  },
  // Future follow-ups
  {
    id: '2',
    leadId: '6',
    leadName: 'Frank Wilson',
    scheduledFor: new Date('2024-01-28T14:00:00'),
    dueDate: new Date('2024-01-28T14:00:00'), // 6 days in future
    status: 'pending',
    notes: 'Discovery call to understand requirements',
    createdAt: new Date('2024-01-20'),
    priority: 'high',
  },
  {
    id: '4',
    leadId: '4',
    leadName: 'David Brown',
    scheduledFor: new Date('2024-01-25T11:00:00'),
    dueDate: new Date('2024-01-25T11:00:00'), // 3 days in future
    status: 'pending',
    notes: 'Contract signing and onboarding',
    createdAt: new Date('2024-01-18'),
    priority: 'high',
  },
  {
    id: '5',
    leadId: '5',
    leadName: 'Eve Martinez',
    scheduledFor: new Date('2024-01-26T10:00:00'),
    dueDate: new Date('2024-01-26T10:00:00'), // 4 days in future
    status: 'pending',
    notes: 'Try reaching out again via email first',
    createdAt: new Date('2024-01-19'),
    priority: 'low',
  },
];

// Mock Dashboard Stats
export const mockDashboardStats = {
  totalLeads: mockLeads.length,
  newLeads: mockLeads.filter(l => l.status === 'new').length,
  qualifiedLeads: mockLeads.filter(l => l.status === 'qualified').length,
  wonDeads: mockLeads.filter(l => l.status === 'won').length,
  conversionRate: 25, // percentage
  avgResponseTime: '5 min',
};

// Helper functions
export const getLeadById = (id: string): Lead | undefined => {
  return mockLeads.find(lead => lead.id === id);
};

export const getLeadsByStatus = (status: Lead['status']): Lead[] => {
  return mockLeads.filter(lead => lead.status === status);
};

export const getLeadsByAssignee = (assignee: string): Lead[] => {
  return mockLeads.filter(lead => lead.assignedTo?.name === assignee);
};

export const getUserByEmail = (email: string): User | undefined => {
  return mockUsers.find(user => user.email === email);
};

export const getCallLogsByLeadId = (leadId: string): CallLog[] => {
  return mockCallLogs.filter(log => log.leadId === leadId);
};

export const getFollowUpsByLeadId = (leadId: string): FollowUp[] => {
  return mockFollowUps.filter(followUp => followUp.leadId === leadId);
};

export const getUnreadNotifications = (): Notification[] => {
  return mockNotifications.filter(notification => !notification.read);
};

// Mock Settings
export const mockSettings = {
  companyName: 'E2W Lead Management',
  emailNotifications: true,
  smsNotifications: false,
  autoAssignLeads: true,
  defaultLeadSource: 'Website',
  workingHours: {
    start: '09:00',
    end: '18:00',
  },
  timezone: 'America/New_York',
};

// Mock Reports Data
export const mockReportsData = {
  totalLeads: mockLeads.length,
  newLeads: mockLeads.filter(l => l.status === 'new').length,
  contactedLeads: mockLeads.filter(l => l.status === 'contacted').length,
  qualifiedLeads: mockLeads.filter(l => l.status === 'qualified').length,
  wonDeals: mockLeads.filter(l => l.status === 'won').length,
  lostDeals: mockLeads.filter(l => l.status === 'lost').length,
  conversionRate: 25,
  avgResponseTime: 2.5,
  totalCalls: mockCallLogs.length,
  totalFollowUps: mockFollowUps.length,
  totalRevenue: 250000,
  avgCallDuration: 6.2,
  leadsPerAgent: [
    { agent: 'John Doe', count: mockLeads.filter(l => l.assignedTo?.name === 'John Doe').length },
    { agent: 'Jane Smith', count: mockLeads.filter(l => l.assignedTo?.name === 'Jane Smith').length },
    { agent: 'Mike Johnson', count: mockLeads.filter(l => l.assignedTo?.name === 'Mike Johnson').length },
  ],
  leadsBySource: [
    { source: 'Website', count: mockLeads.filter(l => l.source === 'Website').length },
    { source: 'Meta', count: mockLeads.filter(l => l.source === 'Meta').length },
    { source: 'Referral', count: mockLeads.filter(l => l.source === 'Referral').length },
    { source: 'Direct', count: mockLeads.filter(l => l.source === 'Direct').length },
    { source: 'WhatsApp', count: mockLeads.filter(l => l.source === 'WhatsApp').length },
    { source: 'Cold Call', count: mockLeads.filter(l => l.source === 'Cold Call').length },
  ],
  leadsByStatus: [
    { status: 'New', count: mockLeads.filter(l => l.status === 'new').length },
    { status: 'Contacted', count: mockLeads.filter(l => l.status === 'contacted').length },
    { status: 'Follow-up', count: mockLeads.filter(l => l.status === 'followup').length },
    { status: 'Qualified', count: mockLeads.filter(l => l.status === 'qualified').length },
    { status: 'Won', count: mockLeads.filter(l => l.status === 'won').length },
    { status: 'Lost', count: mockLeads.filter(l => l.status === 'lost').length },
    { status: 'Unreachable', count: mockLeads.filter(l => l.status === 'unreach').length },
    { status: 'Unqualified', count: mockLeads.filter(l => l.status === 'unqualified').length },
  ],
};

// Mock DSR (Daily Sales Report) Data
export const mockDSRData = [
  {
    id: '1',
    date: new Date('2024-01-20'),
    agentName: 'John Doe',
    callsMade: 15,
    leadsGenerated: 8,
    conversions: 2,
    status: 'completed',
  },
  {
    id: '2',
    date: new Date('2024-01-19'),
    agentName: 'Jane Smith',
    callsMade: 12,
    leadsGenerated: 6,
    conversions: 1,
    status: 'completed',
  },
  {
    id: '3',
    date: new Date('2024-01-18'),
    agentName: 'Mike Johnson',
    callsMade: 18,
    leadsGenerated: 10,
    conversions: 3,
    status: 'completed',
  },
  {
    id: '4',
    date: new Date('2024-01-17'),
    agentName: 'John Doe',
    callsMade: 10,
    leadsGenerated: 5,
    conversions: 1,
    status: 'completed',
  },
];

// Helper function to simulate API delay
export const simulateApiDelay = (ms: number = 500): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Helper function to simulate API response
export const mockApiSuccess = async <T,>(data: T, delay: number = 500): Promise<{ success: boolean; data: T }> => {
  await simulateApiDelay(delay);
  return { success: true, data };
};

export const mockApiError = async (error: string, delay: number = 500): Promise<{ success: boolean; error: string }> => {
  await simulateApiDelay(delay);
  return { success: false, error };
};

// Reactive Data Management Functions (Session-based, in-memory storage)

// Add a new lead
export const addLead = (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Lead => {
  const newLead: Lead = {
    ...leadData,
    id: generateId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockLeads.push(newLead);
  return newLead;
};

// Update a lead
export const updateLead = (id: string, updates: Partial<Lead>): Lead | null => {
  const index = mockLeads.findIndex(lead => lead.id === id);
  if (index === -1) return null;
  
  const currentLead = mockLeads[index]!;
  mockLeads[index] = {
    ...currentLead,
    ...updates,
    updatedAt: new Date(),
  } as Lead;
  return mockLeads[index]!;
};

// Delete a lead
export const deleteLead = (id: string): boolean => {
  const index = mockLeads.findIndex(lead => lead.id === id);
  if (index === -1) return false;
  
  mockLeads.splice(index, 1);
  return true;
};

// Update lead status
export const updateLeadStatus = (id: string, status: Lead['status'], notes?: string): Lead | null => {
  return updateLead(id, { 
    status, 
    notes: notes ? `${new Date().toLocaleString()}: ${notes}` : undefined 
  });
};

// Add a follow-up
export const addFollowUp = (followUpData: Omit<FollowUp, 'id' | 'createdAt'>): FollowUp => {
  const newFollowUp: FollowUp = {
    ...followUpData,
    id: generateId(),
    createdAt: new Date(),
  };
  mockFollowUps.push(newFollowUp);
  return newFollowUp;
};

// Update follow-up status
export const updateFollowUpStatus = (id: string, status: FollowUp['status']): FollowUp | null => {
  const index = mockFollowUps.findIndex(f => f.id === id);
  if (index === -1) return null;
  
  const currentFollowUp = mockFollowUps[index]!;
  mockFollowUps[index] = {
    ...currentFollowUp,
    status,
  } as FollowUp;
  return mockFollowUps[index]!;
};

// Add a call log
export const addCallLog = (callData: Omit<CallLog, 'id' | 'createdAt'>): CallLog => {
  const newCall: CallLog = {
    ...callData,
    id: generateId(),
    createdAt: new Date(),
  };
  mockCallLogs.push(newCall);
  return newCall;
};

// Mark notification as read
export const markNotificationAsRead = (id: string): boolean => {
  const notification = mockNotifications.find(n => n.id === id);
  if (!notification) return false;
  
  notification.read = true;
  return true;
};

// Mark all notifications as read
export const markAllNotificationsAsRead = (): void => {
  mockNotifications.forEach(n => n.read = true);
};

// Add a notification
export const addNotification = (notificationData: Omit<Notification, 'id' | 'createdAt' | 'read'>): Notification => {
  const newNotification: Notification = {
    ...notificationData,
    id: generateId(),
    read: false,
    createdAt: new Date(),
  };
  mockNotifications.unshift(newNotification);
  return newNotification;
};

// Get last call for a lead
export const getLastCallForLead = (leadId: string): CallLog | null => {
  const calls = mockCallLogs
    .filter(call => call.leadId === leadId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return calls.length > 0 ? calls[0]! : null;
};

// Get next follow-up for a lead
export const getNextFollowUpForLead = (leadId: string): FollowUp | null => {
  const followUps = mockFollowUps
    .filter(followUp => followUp.leadId === leadId && followUp.status === 'pending')
    .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  return followUps.length > 0 ? followUps[0]! : null;
};
