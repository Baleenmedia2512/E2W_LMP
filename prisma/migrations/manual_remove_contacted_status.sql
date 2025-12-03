-- Manual migration to remove "contacted" status
-- Execute this SQL directly on your database

-- US-6: Update all leads with 'contacted' status to 'followup' status
-- This ensures data integrity when removing the contacted status
UPDATE `Lead` SET `status` = 'followup' WHERE `status` = 'contacted';

-- Note: After running this migration, the 'contacted' status will no longer be valid
-- All existing 'contacted' leads will be converted to 'followup' status
