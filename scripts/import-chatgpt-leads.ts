/**
 * Import script: ChatGPT Mogapair Mail leads
 * Source: client_names_contact_numbers.xlsx
 * Run: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/import-chatgpt-leads.ts
 */

import * as xlsx from 'xlsx';
import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient, Prisma } from '@prisma/client';

// Load .env.local explicitly, overriding any stale session env vars
config({ path: resolve(process.cwd(), '.env.local'), override: true });

// Strip surrounding quotes that dotenv leaves when .env uses quoted values
function stripQuotes(val: string | undefined): string | undefined {
  if (!val) return val;
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }
  return val;
}
process.env.DATABASE_URL = stripQuotes(process.env.DATABASE_URL);
process.env.DIRECT_DATABASE_URL = stripQuotes(process.env.DIRECT_DATABASE_URL);

const prisma = new PrismaClient();

function cleanPhone(raw: string | number | undefined | null): string {
  if (!raw) return '';
  const str = String(raw).trim();
  // Take first number if comma-separated
  const first = str.split(',')[0].trim();
  // Remove non-digits except leading +
  return first.replace(/[^\d+]/g, '');
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10;
}

async function main() {
  // 1. Read Excel
  const wb = xlsx.readFile('client_names_contact_numbers.xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json<{ [key: string]: string | number }>(ws);

  console.log(`[import] Total rows in Excel: ${rows.length}`);

  // 2. Get active Sales Agents sorted by name (for tiebreak)
  const agents = await prisma.user.findMany({
    where: {
      isActive: true,
      Role: { name: { in: ['Sales Agent'] } },
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  if (agents.length === 0) {
    throw new Error('No active Sales Agents found. Cannot assign leads.');
  }
  console.log(`[import] Found ${agents.length} Sales Agent(s): ${agents.map((a) => a.name).join(', ')}`);

  // 3. Calculate real workload per agent using the same formula as the dashboard:
  //    total_workload = new_leads + followups_today + stuck_leads
  type WorkloadRow = { agent_id: string; total_workload: bigint };
  const workloadRows = await prisma.$queryRaw<WorkloadRow[]>`
    SELECT
      u.id AS agent_id,
      (
        (SELECT COUNT(*) FROM "Lead"
         WHERE "assignedToId" = u.id AND status = 'new')
        +
        (SELECT COUNT(*) FROM "FollowUp" f
         JOIN "Lead" l ON f."leadId" = l.id
         WHERE l."assignedToId" = u.id
           AND f."scheduledAt" >= CURRENT_DATE
           AND f."scheduledAt" <  CURRENT_DATE + INTERVAL '1 day'
           AND f.status NOT IN ('completed', 'cancelled'))
        +
        (SELECT COUNT(DISTINCT l.id) FROM "Lead" l
         WHERE l."assignedToId" = u.id
           AND l.status IN ('new', 'followup', 'qualified')
           AND EXISTS (
             SELECT 1 FROM "FollowUp" f
             WHERE f."leadId" = l.id
               AND f."scheduledAt" < CURRENT_DATE
               AND f.status NOT IN ('completed', 'cancelled')
           )
           AND NOT EXISTS (
             SELECT 1 FROM "FollowUp" f2
             WHERE f2."leadId" = l.id
               AND f2."scheduledAt" >= CURRENT_DATE
               AND f2.status NOT IN ('completed', 'cancelled')
           ))
      ) AS total_workload
    FROM "User" u
    WHERE u.id IN (${Prisma.join(agents.map((a) => a.id))})
  `;

  const countMap = new Map<string, number>(agents.map((a) => [a.id, 0]));
  for (const row of workloadRows) {
    countMap.set(row.agent_id, Number(row.total_workload));
  }

  console.log('[import] Current workload per agent (new + followups_today + stuck):');
  for (const agent of agents) {
    console.log(`  ${agent.name}: ${countMap.get(agent.id)} workload`);
  }

  // Least-loaded round-robin picker
  function getNextAgent(): string {
    let chosen = agents[0];
    let minCount = countMap.get(chosen.id) ?? 0;
    for (const agent of agents) {
      const c = countMap.get(agent.id) ?? 0;
      if (c < minCount) {
        minCount = c;
        chosen = agent;
      }
    }
    countMap.set(chosen.id, (countMap.get(chosen.id) ?? 0) + 1);
    return chosen.id;
  }

  // 4. Process rows
  const now = new Date();
  let inserted = 0;
  let skipped = 0;
  const skippedRows: string[] = [];

  for (const row of rows) {
    const name = String(row['Client Name / Business'] ?? '').trim();
    const rawPhone = row['Contact Number'];
    const phone = cleanPhone(rawPhone);

    if (!name) {
      skipped++;
      skippedRows.push(`(empty name) phone: ${rawPhone}`);
      continue;
    }
    if (!isValidPhone(phone)) {
      skipped++;
      skippedRows.push(`"${name}" → invalid phone: "${rawPhone}"`);
      continue;
    }

    // Check if phone already exists in DB
    const existing = await prisma.lead.findFirst({
      where: { phone },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      skippedRows.push(`"${name}" phone ${phone} already exists (id: ${existing.id})`);
      continue;
    }

    const assignedToId = getNextAgent();

    await prisma.lead.create({
      data: {
        id: randomUUID(),
        name,
        phone,
        source: 'CHATGPT',
        campaign: 'mogapair mail',
        status: 'new',
        priority: 'medium',
        is_existing: false,
        lead_category: 'OUTBOUND',
        assignedToId,
        updatedAt: now,
        createdAt: now,
      },
    });

    inserted++;
  }

  // 5. Summary
  console.log('\n========== IMPORT SUMMARY ==========');
  console.log(`Total rows:  ${rows.length}`);
  console.log(`Inserted:    ${inserted}`);
  console.log(`Skipped:     ${skipped}`);
  if (skippedRows.length > 0) {
    console.log('\nSkipped details:');
    skippedRows.forEach((s) => console.log('  -', s));
  }
  console.log('\nFinal lead counts per agent:');
  for (const agent of agents) {
    console.log(`  ${agent.name}: ${countMap.get(agent.id)} leads`);
  }
  console.log('=====================================');
}

main()
  .catch((err) => {
    console.error('[import] ERROR:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
