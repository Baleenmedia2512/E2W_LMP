/**
 * Simple Data Migration: MySQL to PostgreSQL
 * Exports data from MySQL and imports to Supabase
 */

import mysql from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';

// MySQL Connection
const mysqlConfig = {
  host: '103.191.208.228',
  port: 3306,
  user: 'baleeed5_lmp',
  password: 'E2Wlmp@123#',
  database: 'baleeed5_lmp',
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

// PostgreSQL (Supabase) via Prisma
const prisma = new PrismaClient();

async function migrate() {
  let mysqlPool;
  
  try {
    console.log('🚀 Starting MySQL to PostgreSQL migration...\n');
    
    // Create MySQL Pool
    console.log('📡 Creating MySQL connection pool...');
    mysqlPool = mysql.createPool(mysqlConfig);
    console.log('✅ MySQL pool created\n');

    // Test PostgreSQL
    console.log('📡 Testing PostgreSQL connection...');
    await prisma.$connect();
    console.log('✅ PostgreSQL connected\n');

    // Migrate tables in order (respecting foreign keys)
    
    // 1. Roles
    console.log('📦 Migrating Roles...');
    const [roles] = await mysqlPool.query('SELECT * FROM `Role`');
    for (const role of roles as any[]) {
      await prisma.role.upsert({
        where: { id: role.id },
        update: {
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          createdAt: role.createdAt,
          updatedAt: role.updatedAt,
        },
        create: {
          id: role.id,
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          createdAt: role.createdAt,
          updatedAt: role.updatedAt,
        },
      });
    }
    console.log(`   ✓ Migrated ${(roles as any[]).length} roles\n`);

    // 2. Users
    console.log('📦 Migrating Users...');
    const [users] = await mysqlPool.query('SELECT * FROM `User`');
    for (const user of users as any[]) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: {
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
          googleId: user.googleId,
          password: user.password,
          roleId: user.roleId,
          isActive: user.isActive === 1,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          settings: user.settings,
        },
        create: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
          googleId: user.googleId,
          password: user.password,
          roleId: user.roleId,
          isActive: user.isActive === 1,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          settings: user.settings,
        },
      });
    }
    console.log(`   ✓ Migrated ${(users as any[]).length} users\n`);

    // 3. Leads
    console.log('📦 Migrating Leads...');
    const [leads] = await mysqlPool.query('SELECT * FROM `Lead`');
    let leadCount = 0;
    for (const lead of leads as any[]) {
      await prisma.lead.upsert({
        where: { id: lead.id },
        update: {
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          alternatePhone: lead.alternatePhone,
          address: lead.address,
          city: lead.city,
          state: lead.state,
          pincode: lead.pincode,
          source: lead.source,
          campaign: lead.campaign,
          customerRequirement: lead.customerRequirement,
          status: lead.status,
          priority: lead.priority,
          notes: lead.notes,
          metadata: lead.metadata,
          assignedToId: lead.assignedToId,
          createdById: lead.createdById,
          createdAt: lead.createdAt,
          updatedAt: lead.updatedAt,
          callAttempts: lead.callAttempts,
        },
        create: {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          alternatePhone: lead.alternatePhone,
          address: lead.address,
          city: lead.city,
          state: lead.state,
          pincode: lead.pincode,
          source: lead.source,
          campaign: lead.campaign,
          customerRequirement: lead.customerRequirement,
          status: lead.status,
          priority: lead.priority,
          notes: lead.notes,
          metadata: lead.metadata,
          assignedToId: lead.assignedToId,
          createdById: lead.createdById,
          createdAt: lead.createdAt,
          updatedAt: lead.updatedAt,
          callAttempts: lead.callAttempts,
        },
      });
      leadCount++;
      if (leadCount % 100 === 0) {
        console.log(`   ⏳ Progress: ${leadCount}/${(leads as any[]).length} leads...`);
      }
    }
    console.log(`   ✓ Migrated ${(leads as any[]).length} leads\n`);

    // 4. Activity History
    console.log('📦 Migrating Activity History...');
    const [activities] = await mysqlPool.query('SELECT * FROM `ActivityHistory`');
    let actCount = 0;
    for (const act of activities as any[]) {
      await prisma.activityHistory.upsert({
        where: { id: act.id },
        update: {
          leadId: act.leadId,
          userId: act.userId,
          action: act.action,
          fieldName: act.fieldName,
          oldValue: act.oldValue,
          newValue: act.newValue,
          description: act.description,
          metadata: act.metadata,
          createdAt: act.createdAt,
        },
        create: {
          id: act.id,
          leadId: act.leadId,
          userId: act.userId,
          action: act.action,
          fieldName: act.fieldName,
          oldValue: act.oldValue,
          newValue: act.newValue,
          description: act.description,
          metadata: act.metadata,
          createdAt: act.createdAt,
        },
      });
      actCount++;
      if (actCount % 100 === 0) {
        console.log(`   ⏳ Progress: ${actCount}/${(activities as any[]).length} activities...`);
      }
    }
    console.log(`   ✓ Migrated ${(activities as any[]).length} activities\n`);

    // 5. Call Logs
    console.log('📦 Migrating Call Logs...');
    const [callLogs] = await mysqlPool.query('SELECT * FROM `CallLog`');
    let callCount = 0;
    for (const call of callLogs as any[]) {
      await prisma.callLog.upsert({
        where: { id: call.id },
        update: {
          leadId: call.leadId,
          callerId: call.callerId,
          startedAt: call.startedAt,
          endedAt: call.endedAt,
          duration: call.duration,
          remarks: call.remarks,
          callStatus: call.callStatus,
          attemptNumber: call.attemptNumber,
          recordingUrl: call.recordingUrl,
          customerRequirement: call.customerRequirement,
          metadata: call.metadata,
          createdAt: call.createdAt,
        },
        create: {
          id: call.id,
          leadId: call.leadId,
          callerId: call.callerId,
          startedAt: call.startedAt,
          endedAt: call.endedAt,
          duration: call.duration,
          remarks: call.remarks,
          callStatus: call.callStatus,
          attemptNumber: call.attemptNumber,
          recordingUrl: call.recordingUrl,
          customerRequirement: call.customerRequirement,
          metadata: call.metadata,
          createdAt: call.createdAt,
        },
      });
      callCount++;
      if (callCount % 100 === 0) {
        console.log(`   ⏳ Progress: ${callCount}/${(callLogs as any[]).length} calls...`);
      }
    }
    console.log(`   ✓ Migrated ${(callLogs as any[]).length} call logs\n`);

    // 6. Follow Ups
    console.log('📦 Migrating Follow Ups...');
    const [followUps] = await mysqlPool.query('SELECT * FROM `FollowUp`');
    for (const follow of followUps as any[]) {
      await prisma.followUp.upsert({
        where: { id: follow.id },
        update: {
          leadId: follow.leadId,
          scheduledAt: follow.scheduledAt,
          completedAt: follow.completedAt,
          notes: follow.notes,
          status: follow.status,
          priority: follow.priority,
          createdById: follow.createdById,
          metadata: follow.metadata,
          createdAt: follow.createdAt,
          updatedAt: follow.updatedAt,
          customerRequirement: follow.customerRequirement,
        },
        create: {
          id: follow.id,
          leadId: follow.leadId,
          scheduledAt: follow.scheduledAt,
          completedAt: follow.completedAt,
          notes: follow.notes,
          status: follow.status,
          priority: follow.priority,
          createdById: follow.createdById,
          metadata: follow.metadata,
          createdAt: follow.createdAt,
          updatedAt: follow.updatedAt,
          customerRequirement: follow.customerRequirement,
        },
      });
    }
    console.log(`   ✓ Migrated ${(followUps as any[]).length} follow ups\n`);

    // 7. Notifications
    console.log('📦 Migrating Notifications...');
    const [notifications] = await mysqlPool.query('SELECT * FROM `Notification`');
    let notifCount = 0;
    for (const notif of notifications as any[]) {
      await prisma.notification.upsert({
        where: { id: notif.id },
        update: {
          userId: notif.userId,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          isRead: notif.isRead === 1,
          readAt: notif.readAt,
          metadata: notif.metadata,
          createdAt: notif.createdAt,
          relatedLeadId: notif.relatedLeadId,
        },
        create: {
          id: notif.id,
          userId: notif.userId,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          isRead: notif.isRead === 1,
          readAt: notif.readAt,
          metadata: notif.metadata,
          createdAt: notif.createdAt,
          relatedLeadId: notif.relatedLeadId,
        },
      });
      notifCount++;
      if (notifCount % 100 === 0) {
        console.log(`   ⏳ Progress: ${notifCount}/${(notifications as any[]).length} notifications...`);
      }
    }
    console.log(`   ✓ Migrated ${(notifications as any[]).length} notifications\n`);

    // 8. Audit Logs
    console.log('📦 Migrating Audit Logs...');
    const [auditLogs] = await mysqlPool.query('SELECT * FROM `AuditLog`');
    let auditCount = 0;
    for (const audit of auditLogs as any[]) {
      await prisma.auditLog.upsert({
        where: { id: audit.id },
        update: {
          userId: audit.userId,
          action: audit.action,
          targetType: audit.targetType,
          targetId: audit.targetId,
          changes: audit.changes,
          metadata: audit.metadata,
          ipAddress: audit.ipAddress,
          userAgent: audit.userAgent,
          createdAt: audit.createdAt,
        },
        create: {
          id: audit.id,
          userId: audit.userId,
          action: audit.action,
          targetType: audit.targetType,
          targetId: audit.targetId,
          changes: audit.changes,
          metadata: audit.metadata,
          ipAddress: audit.ipAddress,
          userAgent: audit.userAgent,
          createdAt: audit.createdAt,
        },
      });
      auditCount++;
      if (auditCount % 100 === 0) {
        console.log(`   ⏳ Progress: ${auditCount}/${(auditLogs as any[]).length} audit logs...`);
      }
    }
    console.log(`   ✓ Migrated ${(auditLogs as any[]).length} audit logs\n`);

    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Roles: ${(roles as any[]).length}`);
    console.log(`   - Users: ${(users as any[]).length}`);
    console.log(`   - Leads: ${(leads as any[]).length}`);
    console.log(`   - Activities: ${(activities as any[]).length}`);
    console.log(`   - Call Logs: ${(callLogs as any[]).length}`);
    console.log(`   - Follow Ups: ${(followUps as any[]).length}`);
    console.log(`   - Notifications: ${(notifications as any[]).length}`);
    console.log(`   - Audit Logs: ${(auditLogs as any[]).length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (mysqlPool) await mysqlPool.end();
    await prisma.$disconnect();
  }
}

migrate()
  .then(() => {
    console.log('\n🎉 Data successfully migrated to Supabase PostgreSQL!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error:', error);
    process.exit(1);
  });
