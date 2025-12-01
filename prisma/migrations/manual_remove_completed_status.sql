-- Manual migration to remove completedAt field
-- Execute this SQL directly on your database

-- Remove completedAt column from FollowUp table
ALTER TABLE `FollowUp` DROP COLUMN `completedAt`;
