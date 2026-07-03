/**
 * Reassign overdue leads from one agent to two agents, split equally.
 * Follow-up dates and lead order are preserved.
 *
 * Run with:
 *   npx tsx scripts/reassign-overdue-leads.ts [--dry-run]
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const FROM_SEARCH = 'Leenah';
const TO_SEARCH = ['Gomathi', 'Susmitha'];

const dryRun = process.argv.includes('--dry-run');

async function resolveUser(search: string) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search.toLowerCase(), mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, email: true },
  });
  if (!user) throw new Error(`No user found matching "${search}"`);
  return user;
}

async function main() {
  // Resolve all three users
  const fromUser = await resolveUser(FROM_SEARCH);
  const toUsers = await Promise.all(TO_SEARCH.map(resolveUser));

  console.log(`📤 From:   ${fromUser.name} (${fromUser.email})`);
  toUsers.forEach((u, i) =>
    console.log(`📥 To [${i + 1}]: ${u.name} (${u.email})`)
  );
  console.log();

  const now = new Date();
  const activeStatuses = ['new', 'followup', 'qualified'];

  // Fetch Leenah's active leads that have at least one non-cancelled/completed follow-up
  // whose next effective follow-up was overdue before the last reschedule.
  // After the reschedule script, these leads now have pending future follow-ups.
  // We identify them as: active leads with pending follow-ups (the rescheduled batch).
  const leads = await prisma.lead.findMany({
    where: {
      assignedToId: fromUser.id,
      status: { in: activeStatuses },
      FollowUp: {
        some: {
          status: { notIn: ['completed', 'cancelled'] },
        },
      },
    },
    select: {
      id: true,
      name: true,
      status: true,
      FollowUp: {
        where: { status: { notIn: ['completed', 'cancelled'] } },
        orderBy: { scheduledAt: 'asc' },
      },
    },
  });

  // Sort by earliest active follow-up time to preserve order
  leads.sort((a, b) => {
    const aDate = a.FollowUp[0]?.scheduledAt?.getTime() ?? 0;
    const bDate = b.FollowUp[0]?.scheduledAt?.getTime() ?? 0;
    return aDate - bDate;
  });

  console.log(`📋 Found ${leads.length} leads with active follow-ups assigned to ${fromUser.name}`);

  if (leads.length === 0) {
    console.log('✅ Nothing to reassign.');
    return;
  }

  // Split leads into equal groups using round-robin
  const groups: typeof leads[] = toUsers.map(() => []);
  leads.forEach((lead, i) => {
    groups[i % toUsers.length].push(lead);
  });

  toUsers.forEach((u, i) =>
    console.log(`  → ${u.name}: ${groups[i].length} leads`)
  );
  console.log();

  // Print plan
  console.log('📅 Reassignment plan (first 20 shown):');
  let counter = 0;
  for (let gi = 0; gi < groups.length; gi++) {
    for (const lead of groups[gi]) {
      if (counter >= 20) break;
      const followUpDate = lead.FollowUp[0]?.scheduledAt;
      const dateStr = followUpDate
        ? followUpDate.toLocaleString('en-IN', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
        : 'no follow-up';
      console.log(
        `  ${String(counter + 1).padStart(3)}. [→ ${toUsers[gi].name}] ${lead.name} (${dateStr})`
      );
      counter++;
    }
  }
  if (leads.length > 20) {
    console.log(`  ... and ${leads.length - 20} more`);
  }
  console.log();

  if (dryRun) {
    console.log('🔍 Dry run — no changes written.');
    return;
  }

  const updatedAt = new Date();
  let totalUpdated = 0;

  for (let gi = 0; gi < groups.length; gi++) {
    const newOwner = toUsers[gi];
    for (const lead of groups[gi]) {
      // Reassign the lead
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          assignedToId: newOwner.id,
          updatedAt,
        },
      });

      // Log activity on the lead
      await prisma.activityHistory.create({
        data: {
          id: randomUUID(),
          leadId: lead.id,
          userId: newOwner.id,
          action: 'lead_reassigned',
          fieldName: 'assignedToId',
          oldValue: fromUser.id,
          newValue: newOwner.id,
          description: `Lead reassigned from ${fromUser.name} to ${newOwner.name} (bulk overdue redistribution)`,
          metadata: JSON.stringify({
            trigger: 'reassign-overdue-leads-script',
            fromUserId: fromUser.id,
            toUserId: newOwner.id,
            processedAt: updatedAt.toISOString(),
          }),
          createdAt: updatedAt,
        },
      });

      totalUpdated++;
    }
  }

  console.log(`✅ Reassigned ${totalUpdated} leads from ${fromUser.name}:`);
  toUsers.forEach((u, i) =>
    console.log(`   ${u.name}: ${groups[i].length} leads`)
  );
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
