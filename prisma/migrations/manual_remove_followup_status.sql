-- Manual migration to remove status field from FollowUp table
-- Execute this SQL directly on your database

-- Step 1: Remove the index on status column
ALTER TABLE `FollowUp` DROP INDEX `FollowUp_status_idx`;

-- Step 2: Remove status column from FollowUp table
ALTER TABLE `FollowUp` DROP COLUMN `status`;

-- Note: This will make all followups active by default
-- Any previously cancelled followups will now appear as active
