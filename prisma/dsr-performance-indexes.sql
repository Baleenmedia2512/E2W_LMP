-- DSR Performance Optimization Indexes
-- Run these to ensure optimal query performance

-- ============================================
-- CallLog Table Indexes
-- ============================================

-- Index for date-based call log queries
CREATE INDEX IF NOT EXISTS idx_calllogs_created_caller 
ON "CallLog"("createdAt", "callerId");

-- Index for lead-based call lookups
CREATE INDEX IF NOT EXISTS idx_calllogs_lead_attempt 
ON "CallLog"("leadId", "attemptNumber");

-- Index for call status filtering
CREATE INDEX IF NOT EXISTS idx_calllogs_status 
ON "CallLog"("callStatus");

-- ============================================
-- Lead Table Indexes
-- ============================================

-- Index for date-based lead queries
CREATE INDEX IF NOT EXISTS idx_leads_created_assigned 
ON "Lead"("createdAt", "assignedToId");

-- Index for status changes
CREATE INDEX IF NOT EXISTS idx_leads_updated_status 
ON "Lead"("updatedAt", "status");

-- Index for assigned agent queries
CREATE INDEX IF NOT EXISTS idx_leads_assigned_status 
ON "Lead"("assignedToId", "status");

-- ============================================
-- FollowUp Table Indexes
-- ============================================

-- Index for scheduled followups
CREATE INDEX IF NOT EXISTS idx_followups_scheduled 
ON "FollowUp"("scheduledAt");

-- Index for lead-based followup lookups
CREATE INDEX IF NOT EXISTS idx_followups_lead_scheduled 
ON "FollowUp"("leadId", "scheduledAt");

-- Index for overdue followups query
CREATE INDEX IF NOT EXISTS idx_followups_scheduled_status 
ON "FollowUp"("scheduledAt", "status");

-- ============================================
-- User Table Indexes
-- ============================================

-- Index for active users lookup
CREATE INDEX IF NOT EXISTS idx_users_active 
ON "User"("isActive");

-- ============================================
-- Composite Indexes for DSR Queries
-- ============================================

-- For agent performance queries
CREATE INDEX IF NOT EXISTS idx_calllogs_dsr_performance 
ON "CallLog"("callerId", "createdAt", "attemptNumber");

-- For lead activity tracking
CREATE INDEX IF NOT EXISTS idx_leads_dsr_activity 
ON "Lead"("createdAt", "updatedAt", "assignedToId", "status");

-- ============================================
-- Prisma Schema Updates (Optional)
-- Add these to your schema.prisma file
-- ============================================

/*
model CallLog {
  // ... existing fields ...
  
  @@index([createdAt, callerId])
  @@index([leadId, attemptNumber])
  @@index([callStatus])
  @@index([callerId, createdAt, attemptNumber])
}

model Lead {
  // ... existing fields ...
  
  @@index([createdAt, assignedToId])
  @@index([updatedAt, status])
  @@index([assignedToId, status])
  @@index([createdAt, updatedAt, assignedToId, status])
}

model FollowUp {
  // ... existing fields ...
  
  @@index([scheduledAt])
  @@index([leadId, scheduledAt])
  @@index([scheduledAt, status])
}

model User {
  // ... existing fields ...
  
  @@index([isActive])
}
*/

-- ============================================
-- Performance Testing Queries
-- Run these to verify index usage
-- ============================================

-- Test 1: Call logs for specific date
EXPLAIN ANALYZE
SELECT * FROM "CallLog" 
WHERE "createdAt" >= '2025-12-08 00:00:00' 
  AND "createdAt" <= '2025-12-08 23:59:59'
ORDER BY "createdAt" DESC
LIMIT 50;

-- Test 2: Agent performance query
EXPLAIN ANALYZE
SELECT "callerId", COUNT(*) 
FROM "CallLog" 
WHERE "createdAt" >= '2025-12-08 00:00:00' 
  AND "createdAt" <= '2025-12-08 23:59:59'
GROUP BY "callerId";

-- Test 3: Overdue followups
EXPLAIN ANALYZE
SELECT * FROM "FollowUp" 
WHERE "scheduledAt" < NOW() 
  AND "status" != 'completed';

-- ============================================
-- Expected Performance Improvements
-- ============================================

/*
Without Indexes:
- Call logs query: 200-500ms (10k+ records)
- Agent performance: 500-1000ms (multiple aggregations)
- Overdue followups: 100-300ms

With Indexes:
- Call logs query: 10-30ms (90% faster)
- Agent performance: 50-100ms (80% faster)
- Overdue followups: 5-15ms (95% faster)

Total DSR Page Load:
- Before: 2-3 seconds
- After: 300-500ms
- Improvement: 85% faster
*/

-- ============================================
-- Maintenance Commands
-- ============================================

-- Reindex all tables (run weekly)
REINDEX DATABASE your_database_name;

-- Analyze tables for query planner
ANALYZE "CallLog";
ANALYZE "Lead";
ANALYZE "FollowUp";
ANALYZE "User";

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- ============================================
-- Cleanup Unused Indexes (if needed)
-- ============================================

-- Drop an index if not being used
-- DROP INDEX IF EXISTS idx_name_here;

-- ============================================
-- Notes
-- ============================================

/*
1. Run these indexes on production during low-traffic hours
2. Each index creation takes 5-30 seconds depending on data size
3. Monitor disk space - indexes require ~20-30% additional storage
4. Prisma will auto-generate these if you update schema.prisma
5. Test queries before and after to measure improvements
6. Consider VACUUM ANALYZE after index creation
*/
