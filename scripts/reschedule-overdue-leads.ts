/**
 * Reschedule overdue follow-ups for a specific agent into business-hour slots.
 *
 * Run with:
 *   npx tsx scripts/reschedule-overdue-leads.ts [--dry-run]
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const WORK_START_HOUR = 10;
const WORK_END_HOUR = 17; // 5:00 PM inclusive
const SLOT_MINUTES = 30;
const ASSIGNEE_SEARCH = 'Leenah';

const dryRun = process.argv.includes('--dry-run');

function isWorkingDay(date: Date): boolean {
  const day = date.getDay(); // 0 = Sunday
  return day !== 0;
}

function isWithinWorkingHours(date: Date): boolean {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  if (hours < WORK_START_HOUR) return false;
  if (hours > WORK_END_HOUR) return false;
  if (hours === WORK_END_HOUR && minutes > 0) return false;
  return true;
}

function startOfWorkingDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(WORK_START_HOUR, 0, 0, 0);
  return d;
}

function advanceToNextWorkingDay(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  while (!isWorkingDay(d)) {
    d.setDate(d.getDate() + 1);
  }
  return startOfWorkingDay(d);
}

function snapToNextValidSlot(date: Date): Date {
  let d = new Date(date);

  while (!isWorkingDay(d)) {
    d = advanceToNextWorkingDay(d);
  }

  const hours = d.getHours();
  const minutes = d.getMinutes();

  if (hours < WORK_START_HOUR || (hours === WORK_START_HOUR && minutes === 0 && d < startOfWorkingDay(d))) {
    return startOfWorkingDay(d);
  }

  if (hours < WORK_START_HOUR) {
    return startOfWorkingDay(d);
  }

  if (hours > WORK_END_HOUR || (hours === WORK_END_HOUR && minutes > 0)) {
    return advanceToNextWorkingDay(d);
  }

  return d;
}

function addSlotMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function getTomorrowStart(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(WORK_START_HOUR, 0, 0, 0);

  if (!isWorkingDay(tomorrow)) {
    return advanceToNextWorkingDay(tomorrow);
  }

  return tomorrow;
}

function formatSlot(date: Date): string {
  return date.toLocaleString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

interface OverdueItem {
  followUpId: string;
  leadId: string;
  leadName: string;
  oldScheduledAt: Date;
  newScheduledAt: Date;
}

async function main() {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { contains: ASSIGNEE_SEARCH, mode: 'insensitive' } },
        { email: { contains: ASSIGNEE_SEARCH.toLowerCase(), mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    console.error(`❌ No user found matching "${ASSIGNEE_SEARCH}"`);
    process.exit(1);
  }

  console.log(`👤 Assignee: ${user.name} (${user.email})`);

  const now = new Date();
  const activeStatuses = ['new', 'followup', 'qualified'];

  const leads = await prisma.lead.findMany({
    where: {
      assignedToId: user.id,
      status: { in: activeStatuses },
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

  const overdueItems: Array<{
    followUpId: string;
    leadId: string;
    leadName: string;
    scheduledAt: Date;
  }> = [];

  for (const lead of leads) {
    const followUps = lead.FollowUp;
    if (followUps.length === 0) continue;

    const futureFollowUps = followUps.filter((f) => f.scheduledAt >= now);
    const pastFollowUps = followUps.filter((f) => f.scheduledAt < now);

    let nextFollowUp;
    if (futureFollowUps.length > 0) {
      nextFollowUp = futureFollowUps[0];
    } else if (pastFollowUps.length > 0) {
      nextFollowUp = pastFollowUps.reduce((latest, current) =>
        current.scheduledAt > latest.scheduledAt ? current : latest
      );
    } else {
      continue;
    }

    if (nextFollowUp.scheduledAt < now) {
      overdueItems.push({
        followUpId: nextFollowUp.id,
        leadId: lead.id,
        leadName: lead.name,
        scheduledAt: nextFollowUp.scheduledAt,
      });
    }
  }

  overdueItems.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  console.log(`📋 Found ${overdueItems.length} overdue leads`);

  if (overdueItems.length === 0) {
    console.log('✅ Nothing to reschedule.');
    return;
  }

  let slotCursor = snapToNextValidSlot(getTomorrowStart());
  const reschedules: OverdueItem[] = [];

  for (const item of overdueItems) {
    const candidate = snapToNextValidSlot(slotCursor);
    reschedules.push({
      followUpId: item.followUpId,
      leadId: item.leadId,
      leadName: item.leadName,
      oldScheduledAt: item.scheduledAt,
      newScheduledAt: candidate,
    });

    let next = addSlotMinutes(candidate, SLOT_MINUTES);
    if (!isWithinWorkingHours(next)) {
      next = advanceToNextWorkingDay(next);
    }
    slotCursor = next;
  }

  console.log('\n📅 Reschedule plan:');
  reschedules.forEach((r, i) => {
    console.log(
      `  ${i + 1}. ${r.leadName} — ${formatSlot(r.oldScheduledAt)} → ${formatSlot(r.newScheduledAt)}`
    );
  });

  if (dryRun) {
    console.log('\n🔍 Dry run — no changes written.');
    return;
  }

  const updatedAt = new Date();
  for (const r of reschedules) {
    await prisma.followUp.update({
      where: { id: r.followUpId },
      data: {
        scheduledAt: r.newScheduledAt,
        status: 'pending',
        updatedAt,
      },
    });

    await prisma.activityHistory.create({
      data: {
        id: randomUUID(),
        leadId: r.leadId,
        userId: user.id,
        action: 'followup_rescheduled',
        fieldName: 'scheduledAt',
        oldValue: r.oldScheduledAt.toISOString(),
        newValue: r.newScheduledAt.toISOString(),
        description: `Follow-up bulk-rescheduled from ${formatSlot(r.oldScheduledAt)} to ${formatSlot(r.newScheduledAt)} (business hours)`,
        metadata: JSON.stringify({
          trigger: 'reschedule-overdue-leads-script',
          processedAt: updatedAt.toISOString(),
        }),
        createdAt: updatedAt,
      },
    });
  }

  console.log(`\n✅ Rescheduled ${reschedules.length} follow-ups for ${user.name}.`);
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
