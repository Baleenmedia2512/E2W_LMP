import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create roles
  const salesAgentRole = await prisma.role.upsert({
    where: { name: 'Sales Agent' },
    update: {},
    create: {
      id: 'role_sales_agent',
      name: 'Sales Agent',
      description: 'Sales Agent - Captures leads, updates lead details, logs calls, manages follow-ups, views their own dashboard metrics, manages personal settings.',
      permissions: JSON.stringify({
        canCreateLead: true,
        canUpdateOwnLead: true,
        canLogCall: true,
        canManageFollowup: true,
        canViewOwnDashboard: true,
        canManageOwnSettings: true,
        canViewLeads: true,
        canAssignLeads: false,
        canViewTeamReport: false,
        canViewDSR: false,
      }),
      updatedAt: new Date(),
    },
  });

  const teamLeadRole = await prisma.role.upsert({
    where: { name: 'Team Lead' },
    update: {},
    create: {
      id: 'role_team_lead',
      name: 'Team Lead',
      description: 'Team Lead - Monitors team performance, views and segments leads, assigns/reassigns leads, accesses team-level reports.',
      permissions: JSON.stringify({
        canCreateLead: true,
        canUpdateOwnLead: true,
        canLogCall: true,
        canManageFollowup: true,
        canViewOwnDashboard: true,
        canManageOwnSettings: true,
        canViewLeads: true,
        canAssignLeads: true,
        canViewTeamReport: true,
        canViewDSR: false,
        canMonitorTeam: true,
      }),
      updatedAt: new Date(),
    },
  });

  const superAgentRole = await prisma.role.upsert({
    where: { name: 'Super Agent' },
    update: {},
    create: {
      id: 'role_super_agent',
      name: 'Super Agent',
      description: 'Super Agent - Monitors Daily Sales Report (DSR) for all agents, views summarized performance metrics across the team.',
      permissions: JSON.stringify({
        canCreateLead: true,
        canUpdateOwnLead: true,
        canLogCall: true,
        canManageFollowup: true,
        canViewOwnDashboard: true,
        canManageOwnSettings: true,
        canViewLeads: true,
        canAssignLeads: true,
        canViewTeamReport: true,
        canViewDSR: true,
        canMonitorTeam: true,
        canViewAllMetrics: true,
      }),
      updatedAt: new Date(),
    },
  });

  // Hash password
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  // Create users with their respective roles
  const salesAgent = await prisma.user.upsert({
    where: { email: 'gomathi@baleenmedia.com' },
    update: {},
    create: {
      id: 'user_gomathi',
      name: 'Gomathi',
      email: 'gomathi@baleenmedia.com',
      password: hashedPassword,
      roleId: salesAgentRole.id,
      isActive: true,
      updatedAt: new Date(),
      settings: JSON.stringify({
        notificationPreferences: {
          emailNotifications: true,
          inAppNotifications: true,
          callNotifications: true,
        },
        workingHours: {
          start: '09:00',
          end: '18:00',
        },
      }),
    },
  });

  const teamLead = await prisma.user.upsert({
    where: { email: 'Leenahgrace@baleenmedia.com' },
    update: {},
    create: {
      id: 'user_leenahgrace',
      name: 'Leenahgrace',
      email: 'Leenahgrace@baleenmedia.com',
      password: hashedPassword,
      roleId: teamLeadRole.id,
      isActive: true,
      updatedAt: new Date(),
      settings: JSON.stringify({
        notificationPreferences: {
          emailNotifications: true,
          inAppNotifications: true,
          callNotifications: true,
        },
        workingHours: {
          start: '09:00',
          end: '18:00',
        },
      }),
    },
  });

  const superAgent = await prisma.user.upsert({
    where: { email: 'contact@baleenmdia.com' },
    update: {},
    create: {
      id: 'user_super_agent',
      name: 'Super Agent',
      email: 'contact@baleenmdia.com',
      password: hashedPassword,
      roleId: superAgentRole.id,
      isActive: true,
      updatedAt: new Date(),
      settings: JSON.stringify({
        notificationPreferences: {
          emailNotifications: true,
          inAppNotifications: true,
          callNotifications: true,
        },
        workingHours: {
          start: '09:00',
          end: '18:00',
        },
      }),
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log('\n📋 Created Users:');
  console.log(`
    1. Sales Agent:
       Email: ${salesAgent.email}
       Role: ${salesAgentRole.name}
    
    2. Team Lead:
       Email: ${teamLead.email}
       Role: ${teamLeadRole.name}
    
    3. Super Agent:
       Email: ${superAgent.email}
       Role: ${superAgentRole.name}
    
    🔐 Default Password for all: Admin@123
  `);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
