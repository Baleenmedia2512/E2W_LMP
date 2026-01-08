/**
 * Data Migration Script: MySQL to PostgreSQL (Supabase)
 * 
 * This script connects to your old MySQL database and copies all data
 * to the new Supabase PostgreSQL database using Prisma.
 */

import { PrismaClient as MySQLPrismaClient } from '@prisma/client';
import { PrismaClient as PostgreSQLPrismaClient } from '@prisma/client';

// MySQL Connection (Old Database)
const mysqlDb = new MySQLPrismaClient({
  datasources: {
    db: {
      url: 'mysql://baleeed5_lmp:E2Wlmp%40123%23@103.191.208.228:3306/baleeed5_lmp',
    },
  },
});

// PostgreSQL Connection (New Supabase Database)
const postgresDb = new PostgreSQLPrismaClient();

async function migrateData() {
  console.log('🚀 Starting data migration from MySQL to Supabase PostgreSQL...\n');

  try {
    // Test connections
    console.log('✅ Testing MySQL connection...');
    await mysqlDb.$connect();
    console.log('✅ MySQL connected successfully');

    console.log('✅ Testing PostgreSQL connection...');
    await postgresDb.$connect();
    console.log('✅ PostgreSQL connected successfully\n');

    // Migrate in order (respecting foreign keys)
    
    // 1. Roles
    console.log('📦 Migrating Roles...');
    const roles = await mysqlDb.role.findMany();
    for (const role of roles) {
      await postgresDb.role.upsert({
        where: { id: role.id },
        update: role,
        create: role,
      });
    }
    console.log(`   ✓ Migrated ${roles.length} roles\n`);

    // 2. Users
    console.log('📦 Migrating Users...');
    const users = await mysqlDb.user.findMany();
    for (const user of users) {
      await postgresDb.user.upsert({
        where: { id: user.id },
        update: user,
        create: user,
      });
    }
    console.log(`   ✓ Migrated ${users.length} users\n`);

    // 3. Leads
    console.log('📦 Migrating Leads...');
    const leads = await mysqlDb.lead.findMany();
    let leadCount = 0;
    for (const lead of leads) {
      await postgresDb.lead.upsert({
        where: { id: lead.id },
        update: lead,
        create: lead,
      });
      leadCount++;
      if (leadCount % 100 === 0) {
        console.log(`   ⏳ Migrated ${leadCount}/${leads.length} leads...`);
      }
    }
    console.log(`   ✓ Migrated ${leads.length} leads\n`);

    // 4. Activity History
    console.log('📦 Migrating Activity History...');
    const activities = await mysqlDb.activityHistory.findMany();
    let activityCount = 0;
    for (const activity of activities) {
      await postgresDb.activityHistory.upsert({
        where: { id: activity.id },
        update: activity,
        create: activity,
      });
      activityCount++;
      if (activityCount % 100 === 0) {
        console.log(`   ⏳ Migrated ${activityCount}/${activities.length} activities...`);
      }
    }
    console.log(`   ✓ Migrated ${activities.length} activities\n`);

    // 5. Call Logs
    console.log('📦 Migrating Call Logs...');
    const callLogs = await mysqlDb.callLog.findMany();
    let callCount = 0;
    for (const callLog of callLogs) {
      await postgresDb.callLog.upsert({
        where: { id: callLog.id },
        update: callLog,
        create: callLog,
      });
      callCount++;
      if (callCount % 100 === 0) {
        console.log(`   ⏳ Migrated ${callCount}/${callLogs.length} call logs...`);
      }
    }
    console.log(`   ✓ Migrated ${callLogs.length} call logs\n`);

    // 6. Follow Ups
    console.log('📦 Migrating Follow Ups...');
    const followUps = await mysqlDb.followUp.findMany();
    for (const followUp of followUps) {
      await postgresDb.followUp.upsert({
        where: { id: followUp.id },
        update: followUp,
        create: followUp,
      });
    }
    console.log(`   ✓ Migrated ${followUps.length} follow ups\n`);

    // 7. Notifications
    console.log('📦 Migrating Notifications...');
    const notifications = await mysqlDb.notification.findMany();
    let notifCount = 0;
    for (const notification of notifications) {
      await postgresDb.notification.upsert({
        where: { id: notification.id },
        update: notification,
        create: notification,
      });
      notifCount++;
      if (notifCount % 100 === 0) {
        console.log(`   ⏳ Migrated ${notifCount}/${notifications.length} notifications...`);
      }
    }
    console.log(`   ✓ Migrated ${notifications.length} notifications\n`);

    // 8. Audit Logs
    console.log('📦 Migrating Audit Logs...');
    const auditLogs = await mysqlDb.auditLog.findMany();
    let auditCount = 0;
    for (const auditLog of auditLogs) {
      await postgresDb.auditLog.upsert({
        where: { id: auditLog.id },
        update: auditLog,
        create: auditLog,
      });
      auditCount++;
      if (auditCount % 100 === 0) {
        console.log(`   ⏳ Migrated ${auditCount}/${auditLogs.length} audit logs...`);
      }
    }
    console.log(`   ✓ Migrated ${auditLogs.length} audit logs\n`);

    console.log('✅ Data migration completed successfully!');
    console.log('\n📊 Migration Summary:');
    console.log(`   - Roles: ${roles.length}`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Leads: ${leads.length}`);
    console.log(`   - Activities: ${activities.length}`);
    console.log(`   - Call Logs: ${callLogs.length}`);
    console.log(`   - Follow Ups: ${followUps.length}`);
    console.log(`   - Notifications: ${notifications.length}`);
    console.log(`   - Audit Logs: ${auditLogs.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mysqlDb.$disconnect();
    await postgresDb.$disconnect();
  }
}

// Run migration
migrateData()
  .then(() => {
    console.log('\n🎉 All done! Your data is now in Supabase PostgreSQL.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed with error:', error);
    process.exit(1);
  });
