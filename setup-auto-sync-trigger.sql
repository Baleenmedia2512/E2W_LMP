-- ========================================
-- AUTO-SYNC TRIGGER FOR CALL RECORDINGS
-- ========================================
-- This trigger automatically syncs recordings from call_recordings
-- to CallLog table whenever a new recording is inserted

-- Step 1: Create function that syncs recording to CallLog
CREATE OR REPLACE FUNCTION sync_recording_to_calllog()
RETURNS TRIGGER AS $$
DECLARE
    v_lead_id TEXT;
    v_call_log_id TEXT;
    v_clean_phone TEXT;
    v_assigned_user_id TEXT;
BEGIN
    -- Only process if recording exists
    IF NEW.has_recording = TRUE AND NEW.recording_url IS NOT NULL THEN
        
        -- Clean phone number (last 10 digits)
        v_clean_phone := RIGHT(REGEXP_REPLACE(NEW.phone_number, '[^0-9]', '', 'g'), 10);
        
        -- Find matching lead by phone
        SELECT id, "assignedToId" INTO v_lead_id, v_assigned_user_id
        FROM "Lead"
        WHERE 
            RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) = v_clean_phone
            OR (
                "alternatePhone" IS NOT NULL 
                AND RIGHT(REGEXP_REPLACE("alternatePhone", '[^0-9]', '', 'g'), 10) = v_clean_phone
            )
        LIMIT 1;
        
        IF v_lead_id IS NOT NULL THEN
            -- Check if call log exists within 5 minutes of recording timestamp
            SELECT id INTO v_call_log_id
            FROM "CallLog"
            WHERE 
                lead_id = v_lead_id
                AND "startedAt" BETWEEN (NEW.timestamp - INTERVAL '5 minutes') AND (NEW.timestamp + INTERVAL '5 minutes')
                AND (recording_url IS NULL OR recording_status = 'pending')
            ORDER BY "startedAt" DESC
            LIMIT 1;
            
            IF v_call_log_id IS NOT NULL THEN
                -- Update existing call log
                UPDATE "CallLog"
                SET 
                    recording_url = NEW.recording_url,
                    recording_status = 'available',
                    duration = COALESCE(NEW.duration, duration),
                    recording_app_call_id = NEW.native_call_id,
                    updated_at = NOW()
                WHERE id = v_call_log_id;
                
                RAISE NOTICE '✅ Updated CallLog % with recording', v_call_log_id;
            ELSE
                -- Create new call log
                INSERT INTO "CallLog" (
                    id,
                    lead_id,
                    caller_id,
                    started_at,
                    phone_dialed,
                    call_status,
                    recording_url,
                    recording_status,
                    duration,
                    attempt_number,
                    remarks,
                    created_at,
                    recording_app_call_id
                ) VALUES (
                    gen_random_uuid(),
                    v_lead_id,
                    COALESCE(v_assigned_user_id, 'system'),
                    NEW.timestamp,
                    v_clean_phone,
                    'answer',
                    NEW.recording_url,
                    'available',
                    NEW.duration,
                    1,
                    'Auto-synced from Call Monitor',
                    NOW(),
                    NEW.native_call_id
                );
                
                -- Update lead's call attempts
                UPDATE "Lead"
                SET 
                    call_attempts = COALESCE(call_attempts, 0) + 1,
                    updated_at = NOW()
                WHERE id = v_lead_id;
                
                RAISE NOTICE '✅ Created new CallLog for lead %', v_lead_id;
            END IF;
            
            -- Mark as synced
            NEW.is_synced := TRUE;
            NEW.updated_at := NOW();
            
        ELSE
            RAISE NOTICE '⚠️  No matching lead found for phone: %', v_clean_phone;
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_sync_recording_to_calllog ON call_recordings;

-- Step 3: Create trigger that fires BEFORE INSERT
CREATE TRIGGER trigger_sync_recording_to_calllog
    BEFORE INSERT ON call_recordings
    FOR EACH ROW
    EXECUTE FUNCTION sync_recording_to_calllog();

-- Step 4: Optional - Create trigger for updates too
CREATE OR REPLACE TRIGGER trigger_sync_recording_to_calllog_update
    BEFORE UPDATE OF recording_url ON call_recordings
    FOR EACH ROW
    WHEN (OLD.recording_url IS NULL AND NEW.recording_url IS NOT NULL)
    EXECUTE FUNCTION sync_recording_to_calllog();

-- ========================================
-- VERIFICATION
-- ========================================
-- Check if trigger was created successfully
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%sync_recording%';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ AUTO-SYNC TRIGGER INSTALLED SUCCESSFULLY!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'From now on, all recordings inserted into call_recordings';
    RAISE NOTICE 'will automatically sync to CallLog table.';
    RAISE NOTICE '';
    RAISE NOTICE '📝 No more manual sync needed!';
END $$;
