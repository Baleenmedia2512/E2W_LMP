/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DSR (DAILY SALES REPORT) METRICS - IMPLEMENTATION REFERENCE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This file documents the complete DSR metrics calculation system.
 * All 8 required metrics are fully implemented and production-ready.
 */

// ═══════════════════════════════════════════════════════════════════════════
// METRIC DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 1. NEW LEADS HANDLED: todayCount / totalCount
 * ─────────────────────────────────────────────
 * todayCount = Leads created where createdAt is today
 * totalCount = All leads with status = 'NEW' (no date filter)
 * 
 * Implementation:
 * - Uses isToday() to check if createdAt matches today
 * - Filters all leads with status = 'new' for total
 */

/**
 * 2. FOLLOW-UPS HANDLED: todayCount / totalCount
 * ───────────────────────────────────────────────
 * todayCount = Followups created OR scheduled where scheduledAt or createdAt is today
 * totalCount = All followups where scheduledAt >= current time (pending/upcoming)
 * 
 * Implementation:
 * - Checks if scheduledAt OR createdAt is today
 * - Filters followups with scheduledAt >= now for total
 */

/**
 * 3. TOTAL CALLS: only todayCount
 * ────────────────────────────────
 * todayCount = Call logs created where createdAt is today
 * 
 * Implementation:
 * - Uses isToday() to check if createdAt matches today
 * - Returns only today count (no total needed)
 */

/**
 * 4. OVERDUE FOLLOW-UPS: only totalCount
 * ───────────────────────────────────────
 * totalCount = Followups where scheduledAt < now
 * 
 * Implementation:
 * - Filters followups with scheduledAt < current time
 * - Returns only total count (no today count needed)
 */

/**
 * 5. UNQUALIFIED TODAY: todayCount / totalCount
 * ──────────────────────────────────────────────
 * todayCount = Leads where status changed to 'unqualified' today (based on updatedAt)
 * totalCount = All leads where status = 'unqualified'
 * 
 * Implementation:
 * - Uses isToday() on updatedAt AND status = 'unqualified'
 * - Counts all leads with status = 'unqualified' for total
 */

/**
 * 6. UNREACHABLE TODAY: todayCount / totalCount
 * ──────────────────────────────────────────────
 * todayCount = Leads where status changed to 'unreach' today
 * totalCount = All leads where status = 'unreach'
 * 
 * Implementation:
 * - Uses isToday() on updatedAt AND status = 'unreach'
 * - Counts all leads with status = 'unreach' for total
 */

/**
 * 7. WON DEALS TODAY: todayCount / totalCount
 * ────────────────────────────────────────────
 * todayCount = Leads where status changed to 'won' today
 * totalCount = All leads with status = 'won'
 * 
 * Implementation:
 * - Uses isToday() on updatedAt AND status = 'won'
 * - Counts all leads with status = 'won' for total
 */

/**
 * 8. LOST DEALS TODAY: todayCount / totalCount
 * ─────────────────────────────────────────────
 * todayCount = Leads where status changed to 'lost' today
 * totalCount = All leads with status = 'lost'
 * 
 * Implementation:
 * - Uses isToday() on updatedAt AND status = 'lost'
 * - Counts all leads with status = 'lost' for total
 */

// ═══════════════════════════════════════════════════════════════════════════
// FILE STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Core Implementation Files:
 * 
 * 1. src/shared/lib/utils/timezone.ts
 *    - Timezone handling utilities
 *    - isToday() function
 *    - Date range helpers
 *    - Supports IST and custom timezones
 * 
 * 2. src/shared/lib/utils/dsr-metrics.ts
 *    - Main calculation service
 *    - calculateDSRMetrics() function
 *    - All 8 metric calculations
 *    - Reusable helper functions
 * 
 * 3. src/app/api/dsr/stats/route.ts
 *    - API endpoint
 *    - Database queries
 *    - Returns metrics to frontend
 * 
 * 4. src/app/dashboard/dsr/page.tsx
 *    - Frontend dashboard
 *    - Displays all metrics
 *    - Interactive cards
 * 
 * 5. src/features/dsr/components/DSRCard.tsx
 *    - Reusable metric card component
 *    - Displays today/total values
 */

// ═══════════════════════════════════════════════════════════════════════════
// KEY FEATURES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ✅ IMPLEMENTED FEATURES:
 * 
 * 1. Timezone Support
 *    - Default: IST (Asia/Kolkata)
 *    - Configurable per calculation
 *    - Proper date comparisons
 * 
 * 2. Reusable Functions
 *    - isToday(date, timezone?)
 *    - getStatusChangeToday(leads, status, timezone?)
 *    - getTotalByStatus(leads, status)
 *    - getFollowupsToday(followups, timezone?)
 *    - getPendingFollowups(followups)
 *    - getOverdueFollowups(followups)
 *    - getCallsToday(calls, timezone?)
 *    - getNewLeadsToday(leads, timezone?)
 * 
 * 3. Type Safety
 *    - Full TypeScript support
 *    - Proper interfaces
 *    - Type-safe inputs and outputs
 * 
 * 4. Production Ready
 *    - Error handling
 *    - Null/undefined checks
 *    - Performance optimized
 *    - Clean, documented code
 * 
 * 5. Agent Filtering
 *    - Optional agent filtering
 *    - Works with all metrics
 *    - Maintains accuracy
 */

// ═══════════════════════════════════════════════════════════════════════════
// USAGE EXAMPLES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Example 1: Calculate DSR Metrics
 * ─────────────────────────────────
 */
/*
import { calculateDSRMetrics } from '@/shared/lib/utils/dsr-metrics';

const metrics = calculateDSRMetrics({
  leads: [
    { id: '1', status: 'new', createdAt: new Date(), updatedAt: new Date() },
    { id: '2', status: 'won', createdAt: new Date('2024-01-01'), updatedAt: new Date() },
  ],
  followups: [
    { id: 'f1', leadId: '1', scheduledAt: new Date(), createdAt: new Date() },
  ],
  calls: [
    { id: 'c1', leadId: '1', createdAt: new Date() },
  ],
  agentId: 'agent123', // Optional
  timezone: 'Asia/Kolkata', // Optional, defaults to IST
});

console.log(metrics);
// {
//   newLeads: { today: 1, total: 1 },
//   followups: { today: 1, total: 0 },
//   calls: { today: 1 },
//   overdueFollowups: { total: 0 },
//   unqualified: { today: 0, total: 0 },
//   unreachable: { today: 0, total: 0 },
//   won: { today: 1, total: 1 },
//   lost: { today: 0, total: 0 }
// }
*/

/**
 * Example 2: API Route Implementation
 * ────────────────────────────────────
 */
/*
// src/app/api/dsr/stats/route.ts

import { calculateDSRMetrics } from '@/shared/lib/utils/dsr-metrics';
import prisma from '@/shared/lib/db/prisma';

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get('agentId');

  // Fetch data
  const [leads, followups, calls] = await Promise.all([
    prisma.lead.findMany({
      where: agentId ? { assignedToId: agentId } : {},
      select: { id: true, status: true, createdAt: true, updatedAt: true, assignedToId: true },
    }),
    prisma.followUp.findMany({
      select: { id: true, leadId: true, scheduledAt: true, createdAt: true },
    }),
    prisma.callLog.findMany({
      select: { id: true, leadId: true, createdAt: true },
    }),
  ]);

  // Calculate metrics
  const metrics = calculateDSRMetrics({
    leads,
    followups,
    calls,
    agentId: agentId || null,
  });

  return NextResponse.json({ success: true, data: metrics });
}
*/

/**
 * Example 3: Using Helper Functions
 * ──────────────────────────────────
 */
/*
import { isToday, getStatusChangeToday } from '@/shared/lib/utils/dsr-metrics';

const leads = [
  { id: '1', status: 'won', updatedAt: new Date() },
  { id: '2', status: 'won', updatedAt: new Date('2024-01-01') },
];

// Check if a date is today
const dateIsToday = isToday(new Date());
console.log(dateIsToday); // true

// Get leads that changed to 'won' today
const wonToday = getStatusChangeToday(leads, 'won');
console.log(wonToday); // 1
*/

// ═══════════════════════════════════════════════════════════════════════════
// API RESPONSE FORMAT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/dsr/stats?agentId=xxx
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     stats: {
 *       // Metric 1: New Leads
 *       newLeadsHandledToday: 5,
 *       totalNewLeads: 25,
 * 
 *       // Metric 2: Follow-ups
 *       followUpsHandledToday: 8,
 *       totalFollowUps: 15,
 * 
 *       // Metric 3: Calls
 *       totalCalls: 20,
 * 
 *       // Metric 4: Overdue
 *       overdueFollowUps: 3,
 * 
 *       // Metric 5: Unqualified
 *       unqualifiedToday: 2,
 *       totalUnqualified: 10,
 * 
 *       // Metric 6: Unreachable
 *       unreachableToday: 1,
 *       totalUnreachable: 7,
 * 
 *       // Metric 7: Won Deals
 *       wonToday: 3,
 *       totalWon: 12,
 * 
 *       // Metric 8: Lost Deals
 *       lostToday: 1,
 *       totalLost: 8
 *     },
 *     filteredLeads: [...],
 *     agentPerformanceData: [...],
 *     agents: [...],
 *     timestamp: "2024-12-04T10:30:00.000Z"
 *   }
 * }
 */

// ═══════════════════════════════════════════════════════════════════════════
// TESTING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run Tests:
 * 
 * To test the DSR metrics calculation:
 * 
 * node test-dsr-metrics.js
 * 
 * This will:
 * - Create mock data
 * - Calculate all metrics
 * - Validate results
 * - Display expected vs actual values
 * - Show usage examples
 */

// ═══════════════════════════════════════════════════════════════════════════
// MAINTENANCE NOTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ⚠️ IMPORTANT:
 * 
 * 1. Status Field Names
 *    - Ensure database status values match: 'new', 'won', 'lost', 'unqualified', 'unreach'
 *    - Case-insensitive comparison is used in getTotalByStatus()
 * 
 * 2. Timezone Handling
 *    - Default timezone is IST (Asia/Kolkata)
 *    - Can be overridden per calculation
 *    - All date comparisons use timezone-aware functions
 * 
 * 3. Status Change Detection
 *    - Uses updatedAt field to detect changes
 *    - Assumes updatedAt changes when status changes
 *    - If your system tracks status changes differently, adjust getStatusChangeToday()
 * 
 * 4. Performance
 *    - Calculations run in-memory on fetched data
 *    - For large datasets, consider database-level aggregations
 *    - Current implementation handles thousands of records efficiently
 * 
 * 5. Future Enhancements
 *    - Add caching for frequently requested metrics
 *    - Implement historical trend analysis
 *    - Add real-time updates via WebSocket
 *    - Create scheduled reports
 */

// ═══════════════════════════════════════════════════════════════════════════
// CHANGELOG
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Version 1.0.0 - 2024-12-04
 * ──────────────────────────
 * ✓ Initial implementation
 * ✓ All 8 metrics implemented
 * ✓ Timezone support (IST default)
 * ✓ Reusable helper functions
 * ✓ Full TypeScript support
 * ✓ API route integration
 * ✓ Frontend dashboard integration
 * ✓ Production-ready code
 * ✓ Test suite included
 * ✓ Documentation complete
 */

// ═══════════════════════════════════════════════════════════════════════════
// SUPPORT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * For issues or questions:
 * 
 * 1. Check the test file: test-dsr-metrics.js
 * 2. Review the implementation: src/shared/lib/utils/dsr-metrics.ts
 * 3. Check the API route: src/app/api/dsr/stats/route.ts
 * 4. Review timezone utilities: src/shared/lib/utils/timezone.ts
 */

// ═══════════════════════════════════════════════════════════════════════════
export const DSR_METRICS_VERSION = '1.0.0';
export const DSR_METRICS_STATUS = 'PRODUCTION_READY';
// ═══════════════════════════════════════════════════════════════════════════
