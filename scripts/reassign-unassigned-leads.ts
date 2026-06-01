/**
 * One-time script: Reassign all unassigned is_existing leads via round-robin
 * 
 * Run with:
 *   npx tsx scripts/reassign-unassigned-leads.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Finding unassigned existing-client leads...');

  // Step 1: Get all unassigned is_existing leads
  const unassignedLeads = await prisma.lead.findMany({
    where: {
      is_existing: true,
      assignedToId: null,
    },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`📋 Found ${unassignedLeads.length} unassigned leads`);

  if (!unassignedLeads.length) {
    console.log('✅ Nothing to reassign. All leads are already assigned.');
    return;
  }

  // Step 2: Get Sales Agents
  const agents = await prisma.user.findMany({
    where: {
      isActive: true,
      Role: { name: { in: ['Sales Agent'] } },
    },
    select: { id: true, name: true },
  });

  if (!agents.length) {
    console.error('❌ No active Sales Agents found. Cannot assign.');
    return;
  }

  console.log(`👥 Agents in pool: ${agents.map((a) => a.name).join(', ')}`);

  // Step 3: Get starting round-robin index from last assigned lead
  let startIndex = 0;
  const lastAssigned = await prisma.lead.findFirst({
    where: { assignedToId: { not: null } },
    orderBy: { updatedAt: 'desc' },
    select: { assignedToId: true },
  });
  if (lastAssigned?.assignedToId) {
    const idx = agents.findIndex((a) => a.id === lastAssigned.assignedToId);
    startIndex = idx === -1 ? 0 : (idx + 1) % agents.length;
  }

  // Step 4: Batch update each lead with round-robin agent
  const now = new Date();
  const updates = unassignedLeads.map((lead, i) => {
    const agent = agents[(startIndex + i) % agents.length];
    return prisma.lead.update({
      where: { id: lead.id },
      data: { assignedToId: agent.id, updatedAt: now },
    });
  });

  // Run in batches of 50 to avoid overwhelming DB
  const batchSize = 50;
  let totalUpdated = 0;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    await Promise.all(batch);
    totalUpdated += batch.length;
    console.log(`  ✓ Assigned ${totalUpdated}/${unassignedLeads.length}`);
  }

  // Summary
  const tally: Record<string, number> = {};
  unassignedLeads.forEach((_, i) => {
    const agent = agents[(startIndex + i) % agents.length];
    tally[agent.name] = (tally[agent.name] || 0) + 1;
  });

  console.log('\n✅ Done! Distribution:');
  Object.entries(tally).forEach(([name, count]) => {
    console.log(`   ${name}: ${count} leads`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
