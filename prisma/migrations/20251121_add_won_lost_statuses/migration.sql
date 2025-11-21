-- AlterTable: Add new lead statuses (won, lost, contacted, qualified)
-- Note: This migration updates the Lead table to support new statuses

-- Update existing status comments
ALTER TABLE `Lead` MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'new' COMMENT 'new, contacted, qualified, followup, won, lost, unreach, unqualified';

-- No data migration needed as existing statuses (new, followup, unreach, unqualified) remain valid
-- New statuses (contacted, qualified, won, lost) can be used going forward
