import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data (in development only)
  if (process.env.NODE_ENV === 'development') {
    await prisma.notification.deleteMany();
    await prisma.undoLog.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.dSRExport.deleteMany();
    await prisma.followUp.deleteMany();
    await prisma.callLog.deleteMany();
    await prisma.assignment.deleteMany();
    await prisma.leadRaw.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();
    console.log('✅ Cleaned existing data');
  }

  // Seed Roles
  const roles = await Promise.all([
    prisma.role.create({
      data: {
        name: 'Agent',
        description: 'Regular sales agent with limited permissions',
        permissions: JSON.stringify({
          leads: { read: true, create: false, update: true, delete: false },
          dashboard: { read: true },
          dsr: { read: 'own' },
          calls: { read: true, create: true },
          followups: { read: true, create: true },
        }),
      },
    }),
    prisma.role.create({
      data: {
        name: 'SuperAgent',
        description: 'Senior agent with team management permissions',
        permissions: JSON.stringify({
          leads: { read: 'all', create: true, update: true, delete: true },
          dashboard: { read: 'all' },
          dsr: { read: 'all', export: true },
          calls: { read: 'all', create: true },
          followups: { read: 'all', create: true },
          users: { read: true, assign: true },
        }),
      },
    }),
    prisma.role.create({
      data: {
        name: 'Finance',
        description: 'Finance team member',
        permissions: JSON.stringify({
          leads: { read: 'converted' },
          dashboard: { read: true },
          dsr: { read: 'all', export: true },
          reports: { read: true },
        }),
      },
    }),
    prisma.role.create({
      data: {
        name: 'HR',
        description: 'HR team member',
        permissions: JSON.stringify({
          users: { read: true, create: true, update: true },
          dsr: { read: 'all' },
          reports: { read: true },
        }),
      },
    }),
    prisma.role.create({
      data: {
        name: 'Procurement',
        description: 'Procurement team member',
        permissions: JSON.stringify({
          leads: { read: 'qualified' },
          dashboard: { read: true },
          reports: { read: true },
        }),
      },
    }),
  ]);

  console.log('✅ Created roles:', roles.map((r) => r.name).join(', '));

  // Seed Test Users
  const superAgentRole = roles.find((r) => r.name === 'SuperAgent');
  const agentRole = roles.find((r) => r.name === 'Agent');

  if (!superAgentRole || !agentRole) {
    throw new Error('Required roles not found');
  }

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: process.env.GOOGLE_TEST_EMAIL || 'admin@example.com',
        name: 'Admin SuperAgent',
        googleId: process.env.GOOGLE_TEST_ID || 'test-google-id-admin',
        roleId: superAgentRole.id,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'agent1@example.com',
        name: 'Agent One',
        googleId: 'test-google-id-agent1',
        roleId: agentRole.id,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'agent2@example.com',
        name: 'Agent Two',
        googleId: 'test-google-id-agent2',
        roleId: agentRole.id,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'agent3@example.com',
        name: 'Agent Three',
        googleId: 'test-google-id-agent3',
        roleId: agentRole.id,
        isActive: true,
      },
    }),
  ]);

  console.log('✅ Created users:', users.map((u) => u.email).join(', '));

  // Seed Sample Leads
  const leadSources = ['Meta', 'Website', 'Referral', 'Google Ads', 'Facebook'];
  const leadStatuses = ['new', 'contacted', 'qualified', 'converted', 'lost'];
  const campaigns = ['Summer Sale 2024', 'Product Launch', 'Referral Program', 'Brand Awareness'];

  const sampleLeads = [];
  for (let i = 1; i <= 15; i++) {
    const randomAgent = users[Math.floor(Math.random() * users.length)];
    const randomStatus = leadStatuses[Math.floor(Math.random() * leadStatuses.length)];
    const randomSource = leadSources[Math.floor(Math.random() * leadSources.length)];
    const randomCampaign = campaigns[Math.floor(Math.random() * campaigns.length)];

    const lead = await prisma.lead.create({
      data: {
        name: `Lead ${i}`,
        phone: `+91${9000000000 + i}`,
        email: `lead${i}@example.com`,
        alternatePhone: i % 3 === 0 ? `+91${8000000000 + i}` : null,
        address: `${i} Main Street`,
        city: i % 2 === 0 ? 'Mumbai' : 'Delhi',
        state: i % 2 === 0 ? 'Maharashtra' : 'Delhi',
        pincode: `40000${i}`,
        source: randomSource || 'website',
        campaign: randomCampaign,
        status: randomStatus,
        priority: i % 3 === 0 ? 'high' : i % 2 === 0 ? 'medium' : 'low',
        assignedToId: i > 3 && randomAgent ? randomAgent.id : null, // First 3 unassigned
        createdById: users[0].id,
        notes: `Sample lead ${i} for testing purposes`,
        metadata: JSON.stringify({
          interestLevel: Math.floor(Math.random() * 10) + 1,
          budget: Math.floor(Math.random() * 100000) + 50000,
        }),
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)),
      },
    });

    sampleLeads.push(lead);

    // Add raw data
    await prisma.leadRaw.create({
      data: {
        leadId: lead.id,
        source: randomSource || 'website',
        payload: JSON.stringify({
          form_id: `form_${i}`,
          campaign_id: `campaign_${i}`,
          ad_id: `ad_${i}`,
          submitted_at: new Date().toISOString(),
        }),
      },
    });
  }

  console.log(`✅ Created ${sampleLeads.length} sample leads`);

  // Seed Call Logs
  const callLogs = [];
  for (let i = 0; i < 10; i++) {
    const randomLead = sampleLeads[Math.floor(Math.random() * sampleLeads.length)];
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const startTime = new Date(Date.now() - Math.floor(Math.random() * 5 * 24 * 60 * 60 * 1000));
    const duration = Math.floor(Math.random() * 600) + 30; // 30-630 seconds

    if (!randomLead || !randomUser) continue;
    
    const callLog = await prisma.callLog.create({
      data: {
        leadId: randomLead.id,
        callerId: randomUser.id,
        startedAt: startTime,
        endedAt: new Date(startTime.getTime() + duration * 1000),
        duration,
        remarks: `Call attempt ${i + 1}. Customer showed interest.`,
        callStatus: ['answered', 'not_answered', 'busy'][Math.floor(Math.random() * 3)],
        attemptNumber: Math.floor(Math.random() * 3) + 1,
      },
    });
    callLogs.push(callLog);
  }

  console.log(`✅ Created ${callLogs.length} call logs`);

  // Seed Follow-ups
  const followUps = [];
  for (let i = 0; i < 8; i++) {
    const randomLead = sampleLeads[Math.floor(Math.random() * sampleLeads.length)];
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const scheduledDate = new Date();
    
    // Some for today, some for future
    if (i < 3) {
      scheduledDate.setHours(9, 0, 0, 0); // Today at 9 AM
    } else {
      scheduledDate.setDate(scheduledDate.getDate() + Math.floor(Math.random() * 7) + 1);
      scheduledDate.setHours(9, 0, 0, 0);
    }

    if (!randomLead || !randomUser) continue;

    const followUp = await prisma.followUp.create({
      data: {
        leadId: randomLead.id,
        scheduledAt: scheduledDate,
        notes: `Follow-up scheduled for ${randomLead.name}`,
        status: i < 2 ? 'completed' : 'pending',
        priority: (['low', 'medium', 'high'] as const)[Math.floor(Math.random() * 3)] || 'medium',
        createdById: randomUser.id,
        completedAt: i < 2 ? new Date() : null,
      },
    });
    followUps.push(followUp);
  }

  console.log(`✅ Created ${followUps.length} follow-ups`);

  // Seed Assignments
  const assignments = [];
  for (const lead of sampleLeads.filter((l) => l.assignedToId)) {
    const assignment = await prisma.assignment.create({
      data: {
        leadId: lead.id,
        assignedToId: lead.assignedToId!,
        assignedById: users[0].id,
        assignmentType: Math.random() > 0.5 ? 'auto' : 'manual',
        reason: Math.random() > 0.5 ? 'Auto-assigned based on workload' : 'Manually assigned by admin',
      },
    });
    assignments.push(assignment);
  }

  console.log(`✅ Created ${assignments.length} assignments`);

  // Seed Audit Logs
  const auditLogs = [];
  for (let i = 0; i < 5; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomLead = sampleLeads[Math.floor(Math.random() * sampleLeads.length)];

    if (!randomLead || !randomUser) continue;
    
    const actions = ['create', 'update', 'assign', 'call'] as const;
    const randomAction = actions[Math.floor(Math.random() * actions.length)] || 'create';
    const auditLog = await prisma.auditLog.create({
      data: {
        action: randomAction,
        userId: randomUser.id,
        targetType: 'Lead',
        targetId: randomLead.id,
        changes: JSON.stringify({
          before: { status: 'new' },
          after: { status: 'contacted' },
        }),
        metadata: JSON.stringify({ timestamp: new Date().toISOString() }),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      },
    });
    auditLogs.push(auditLog);
  }

  console.log(`✅ Created ${auditLogs.length} audit logs`);

  // Seed Notifications
  const notifications = [];
  for (let i = 0; i < 5; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)];

    if (!randomUser) continue;
    
    const types = ['new_lead', 'follow_up_due', 'assignment'] as const;
    const randomType = types[Math.floor(Math.random() * types.length)] || 'new_lead';
    const notification = await prisma.notification.create({
      data: {
        userId: randomUser.id,
        type: randomType,
        title: 'New Lead Assigned',
        message: 'You have been assigned a new lead. Please follow up.',
        isRead: i < 2,
        readAt: i < 2 ? new Date() : null,
      },
    });
    notifications.push(notification);
  }

  console.log(`✅ Created ${notifications.length} notifications`);

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - Roles: ${roles.length}`);
  console.log(`   - Users: ${users.length}`);
  console.log(`   - Leads: ${sampleLeads.length}`);
  console.log(`   - Call Logs: ${callLogs.length}`);
  console.log(`   - Follow-ups: ${followUps.length}`);
  console.log(`   - Assignments: ${assignments.length}`);
  console.log(`   - Audit Logs: ${auditLogs.length}`);
  console.log(`   - Notifications: ${notifications.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
