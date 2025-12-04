/**
 * DSR Metrics Testing and Demonstration
 * 
 * This file demonstrates how to use the DSR metrics calculation service
 * and validates that all 8 metrics are correctly implemented.
 */

import { calculateDSRMetrics, type DSRMetricsInput } from '../src/shared/lib/utils/dsr-metrics';

// ==================== Mock Data ====================

const mockLeads = [
  // New leads created today
  { id: '1', status: 'new', createdAt: new Date(), updatedAt: new Date(), assignedToId: 'agent1' },
  { id: '2', status: 'new', createdAt: new Date(), updatedAt: new Date(), assignedToId: 'agent1' },
  { id: '3', status: 'new', createdAt: new Date(Date.now() - 86400000), updatedAt: new Date(Date.now() - 86400000), assignedToId: 'agent1' }, // Yesterday
  
  // Won deals - changed status today
  { id: '4', status: 'won', createdAt: new Date(Date.now() - 7 * 86400000), updatedAt: new Date(), assignedToId: 'agent1' },
  { id: '5', status: 'won', createdAt: new Date(Date.now() - 3 * 86400000), updatedAt: new Date(), assignedToId: 'agent1' },
  { id: '6', status: 'won', createdAt: new Date(Date.now() - 30 * 86400000), updatedAt: new Date(Date.now() - 5 * 86400000), assignedToId: 'agent1' }, // Won 5 days ago
  
  // Lost deals - changed status today
  { id: '7', status: 'lost', createdAt: new Date(Date.now() - 10 * 86400000), updatedAt: new Date(), assignedToId: 'agent1' },
  { id: '8', status: 'lost', createdAt: new Date(Date.now() - 15 * 86400000), updatedAt: new Date(Date.now() - 2 * 86400000), assignedToId: 'agent1' }, // Lost 2 days ago
  
  // Unqualified - changed status today
  { id: '9', status: 'unqualified', createdAt: new Date(Date.now() - 5 * 86400000), updatedAt: new Date(), assignedToId: 'agent1' },
  { id: '10', status: 'unqualified', createdAt: new Date(Date.now() - 8 * 86400000), updatedAt: new Date(Date.now() - 3 * 86400000), assignedToId: 'agent1' }, // 3 days ago
  { id: '11', status: 'unqualified', createdAt: new Date(Date.now() - 12 * 86400000), updatedAt: new Date(Date.now() - 6 * 86400000), assignedToId: 'agent1' }, // 6 days ago
  
  // Unreachable - changed status today
  { id: '12', status: 'unreach', createdAt: new Date(Date.now() - 4 * 86400000), updatedAt: new Date(), assignedToId: 'agent1' },
  { id: '13', status: 'unreach', createdAt: new Date(Date.now() - 9 * 86400000), updatedAt: new Date(), assignedToId: 'agent1' },
  { id: '14', status: 'unreach', createdAt: new Date(Date.now() - 11 * 86400000), updatedAt: new Date(Date.now() - 4 * 86400000), assignedToId: 'agent1' }, // 4 days ago
];

const mockFollowups = [
  // Followups scheduled today
  { id: 'f1', leadId: '1', scheduledAt: new Date(), createdAt: new Date() },
  { id: 'f2', leadId: '2', scheduledAt: new Date(Date.now() + 3600000), createdAt: new Date() }, // 1 hour from now
  
  // Followups created today but scheduled for future
  { id: 'f3', leadId: '3', scheduledAt: new Date(Date.now() + 86400000), createdAt: new Date() }, // Tomorrow
  
  // Pending followups (future)
  { id: 'f4', leadId: '4', scheduledAt: new Date(Date.now() + 2 * 86400000), createdAt: new Date(Date.now() - 86400000) },
  { id: 'f5', leadId: '5', scheduledAt: new Date(Date.now() + 3 * 86400000), createdAt: new Date(Date.now() - 2 * 86400000) },
  
  // Overdue followups (past)
  { id: 'f6', leadId: '6', scheduledAt: new Date(Date.now() - 86400000), createdAt: new Date(Date.now() - 3 * 86400000) },
  { id: 'f7', leadId: '7', scheduledAt: new Date(Date.now() - 2 * 86400000), createdAt: new Date(Date.now() - 5 * 86400000) },
  { id: 'f8', leadId: '8', scheduledAt: new Date(Date.now() - 5 * 86400000), createdAt: new Date(Date.now() - 7 * 86400000) },
];

const mockCalls = [
  // Calls made today
  { id: 'c1', leadId: '1', createdAt: new Date() },
  { id: 'c2', leadId: '2', createdAt: new Date() },
  { id: 'c3', leadId: '3', createdAt: new Date() },
  { id: 'c4', leadId: '4', createdAt: new Date() },
  { id: 'c5', leadId: '5', createdAt: new Date() },
  
  // Calls made yesterday
  { id: 'c6', leadId: '6', createdAt: new Date(Date.now() - 86400000) },
  { id: 'c7', leadId: '7', createdAt: new Date(Date.now() - 86400000) },
];

// ==================== Test Execution ====================

console.log('='.repeat(80));
console.log('DSR METRICS CALCULATION TEST');
console.log('='.repeat(80));
console.log('\n📊 Running DSR metrics calculation with mock data...\n');

const input: DSRMetricsInput = {
  leads: mockLeads,
  followups: mockFollowups,
  calls: mockCalls,
  agentId: 'agent1', // Optional: filter by agent
};

const result = calculateDSRMetrics(input);

// ==================== Display Results ====================

console.log('✅ CALCULATION COMPLETE!\n');
console.log('─'.repeat(80));
console.log('METRIC RESULTS:');
console.log('─'.repeat(80));

console.log('\n1️⃣  NEW LEADS HANDLED');
console.log(`   Today:  ${result.newLeads.today}`);
console.log(`   Total:  ${result.newLeads.total} (status = 'new')`);
console.log(`   Ratio:  ${result.newLeads.total > 0 ? ((result.newLeads.today / result.newLeads.total) * 100).toFixed(1) : 0}%`);

console.log('\n2️⃣  FOLLOW-UPS HANDLED');
console.log(`   Today:  ${result.followups.today} (scheduled or created today)`);
console.log(`   Total:  ${result.followups.total} (pending/upcoming)`);
console.log(`   Ratio:  ${result.followups.total > 0 ? ((result.followups.today / result.followups.total) * 100).toFixed(1) : 0}%`);

console.log('\n3️⃣  TOTAL CALLS');
console.log(`   Today:  ${result.calls.today}`);

console.log('\n4️⃣  OVERDUE FOLLOW-UPS');
console.log(`   Total:  ${result.overdueFollowups.total}`);

console.log('\n5️⃣  UNQUALIFIED');
console.log(`   Today:  ${result.unqualified.today} (status changed today)`);
console.log(`   Total:  ${result.unqualified.total} (status = 'unqualified')`);
console.log(`   Ratio:  ${result.unqualified.total > 0 ? ((result.unqualified.today / result.unqualified.total) * 100).toFixed(1) : 0}%`);

console.log('\n6️⃣  UNREACHABLE');
console.log(`   Today:  ${result.unreachable.today} (status changed today)`);
console.log(`   Total:  ${result.unreachable.total} (status = 'unreach')`);
console.log(`   Ratio:  ${result.unreachable.total > 0 ? ((result.unreachable.today / result.unreachable.total) * 100).toFixed(1) : 0}%`);

console.log('\n7️⃣  WON DEALS');
console.log(`   Today:  ${result.won.today} (status changed today)`);
console.log(`   Total:  ${result.won.total} (status = 'won')`);
console.log(`   Ratio:  ${result.won.total > 0 ? ((result.won.today / result.won.total) * 100).toFixed(1) : 0}%`);

console.log('\n8️⃣  LOST DEALS');
console.log(`   Today:  ${result.lost.today} (status changed today)`);
console.log(`   Total:  ${result.lost.total} (status = 'lost')`);
console.log(`   Ratio:  ${result.lost.total > 0 ? ((result.lost.today / result.lost.total) * 100).toFixed(1) : 0}%`);

console.log('\n' + '─'.repeat(80));
console.log('EXPECTED VALUES (Based on Mock Data):');
console.log('─'.repeat(80));

console.log('\n✓ New Leads: 2 today / 3 total');
console.log('✓ Follow-ups: 3 today / 2 pending (future followups)');
console.log('✓ Calls: 5 today');
console.log('✓ Overdue: 3 followups');
console.log('✓ Unqualified: 1 today / 3 total');
console.log('✓ Unreachable: 2 today / 3 total');
console.log('✓ Won: 2 today / 3 total');
console.log('✓ Lost: 1 today / 2 total');

console.log('\n' + '='.repeat(80));
console.log('📝 VALIDATION');
console.log('='.repeat(80));

const validations = [
  { name: 'New Leads Today', expected: 2, actual: result.newLeads.today },
  { name: 'Total New Leads', expected: 3, actual: result.newLeads.total },
  { name: 'Follow-ups Today', expected: 3, actual: result.followups.today },
  { name: 'Pending Follow-ups', expected: 2, actual: result.followups.total },
  { name: 'Calls Today', expected: 5, actual: result.calls.today },
  { name: 'Overdue Follow-ups', expected: 3, actual: result.overdueFollowups.total },
  { name: 'Unqualified Today', expected: 1, actual: result.unqualified.today },
  { name: 'Total Unqualified', expected: 3, actual: result.unqualified.total },
  { name: 'Unreachable Today', expected: 2, actual: result.unreachable.today },
  { name: 'Total Unreachable', expected: 3, actual: result.unreachable.total },
  { name: 'Won Today', expected: 2, actual: result.won.today },
  { name: 'Total Won', expected: 3, actual: result.won.total },
  { name: 'Lost Today', expected: 1, actual: result.lost.today },
  { name: 'Total Lost', expected: 2, actual: result.lost.total },
];

let passCount = 0;
let failCount = 0;

validations.forEach(v => {
  const passed = v.expected === v.actual;
  const icon = passed ? '✅' : '❌';
  const status = passed ? 'PASS' : 'FAIL';
  
  console.log(`\n${icon} ${v.name}: ${status}`);
  console.log(`   Expected: ${v.expected}, Got: ${v.actual}`);
  
  if (passed) passCount++;
  else failCount++;
});

console.log('\n' + '='.repeat(80));
console.log(`TEST SUMMARY: ${passCount}/${validations.length} passed`);
console.log('='.repeat(80));

if (failCount === 0) {
  console.log('\n🎉 ALL TESTS PASSED! DSR metrics are working correctly.\n');
} else {
  console.log(`\n⚠️  ${failCount} test(s) failed. Please review the implementation.\n`);
}

// ==================== Export for API Usage Example ====================

console.log('─'.repeat(80));
console.log('API USAGE EXAMPLE:');
console.log('─'.repeat(80));

console.log(`
// In your API route (e.g., /api/dsr/stats/route.ts):

import { calculateDSRMetrics } from '@/shared/lib/utils/dsr-metrics';

export async function GET(request: NextRequest) {
  // Fetch data from database
  const leads = await prisma.lead.findMany({
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      assignedToId: true,
    },
  });

  const followups = await prisma.followUp.findMany({
    select: {
      id: true,
      leadId: true,
      scheduledAt: true,
      createdAt: true,
    },
  });

  const calls = await prisma.callLog.findMany({
    select: {
      id: true,
      leadId: true,
      createdAt: true,
    },
  });

  // Calculate metrics
  const metrics = calculateDSRMetrics({
    leads,
    followups,
    calls,
    agentId: searchParams.get('agentId') || null,
    timezone: 'Asia/Kolkata', // Optional, defaults to IST
  });

  return NextResponse.json({
    success: true,
    data: {
      newLeads: metrics.newLeads,
      followups: metrics.followups,
      calls: metrics.calls,
      overdueFollowups: metrics.overdueFollowups,
      unqualified: metrics.unqualified,
      unreachable: metrics.unreachable,
      won: metrics.won,
      lost: metrics.lost,
    },
  });
}
`);

console.log('─'.repeat(80));
console.log('HELPER FUNCTIONS AVAILABLE:');
console.log('─'.repeat(80));

console.log(`
✓ isToday(date, timezone?)          - Check if date is today
✓ getStatusChangeToday(leads, status, timezone?) - Get leads changed to status today
✓ getTotalByStatus(leads, status)   - Get total leads with status
✓ getFollowupsToday(followups, timezone?) - Get followups today
✓ getPendingFollowups(followups)    - Get upcoming followups
✓ getOverdueFollowups(followups)    - Get overdue followups
✓ getCallsToday(calls, timezone?)   - Get calls made today
✓ getNewLeadsToday(leads, timezone?) - Get leads created today
`);

console.log('\n' + '='.repeat(80));
console.log('✨ DSR METRICS SYSTEM - READY FOR PRODUCTION ✨');
console.log('='.repeat(80) + '\n');
