const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupAutoSync() {
  try {
    console.log('🔧 Setting up automatic sync trigger...\n');
    
    // Create the sync function
    console.log('Step 1: Creating sync function...');
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION sync_recording_to_calllog()
      RETURNS TRIGGER AS $$
      DECLARE
          v_lead_id TEXT;
          v_call_log_id TEXT;
          v_clean_phone TEXT;
          v_assigned_user_id TEXT;
      BEGIN
          IF NEW.has_recording = TRUE AND NEW.recording_url IS NOT NULL THEN
              
              v_clean_phone := RIGHT(REGEXP_REPLACE(NEW.phone_number, '[^0-9]', '', 'g'), 10);
              
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
                  SELECT id INTO v_call_log_id
                  FROM "CallLog"
                  WHERE 
                      "leadId" = v_lead_id
                      AND "startedAt" BETWEEN (NEW.timestamp - INTERVAL '5 minutes') AND (NEW.timestamp + INTERVAL '5 minutes')
                      AND ("recordingUrl" IS NULL OR "recordingStatus" = 'pending')
                  ORDER BY "startedAt" DESC
                  LIMIT 1;
                  
                  IF v_call_log_id IS NOT NULL THEN
                      UPDATE "CallLog"
                      SET 
                          "recordingUrl" = NEW.recording_url,
                          "recordingStatus" = 'available',
                          duration = COALESCE(NEW.duration, duration),
                          "recordingAppCallId" = NEW.native_call_id
                      WHERE id = v_call_log_id;
                      
                      RAISE NOTICE 'Updated CallLog % with recording', v_call_log_id;
                  ELSE
                      INSERT INTO "CallLog" (
                          id,
                          "leadId",
                          "callerId",
                          "startedAt",
                          "phoneDialed",
                          "callStatus",
                          "recordingUrl",
                          "recordingStatus",
                          duration,
                          "attemptNumber",
                          remarks,
                          "createdAt",
                          "recordingAppCallId"
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
                      
                      UPDATE "Lead"
                      SET 
                          "callAttempts" = COALESCE("callAttempts", 0) + 1,
                          "updatedAt" = NOW()
                      WHERE id = v_lead_id;
                      
                      RAISE NOTICE 'Created new CallLog for lead %', v_lead_id;
                  END IF;
                  
                  NEW.is_synced := TRUE;
                  NEW.updated_at := NOW();
                  
              END IF;
              
          END IF;
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Function created\n');
    
    // Drop existing triggers
    console.log('Step 2: Removing old triggers (if any)...');
    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS trigger_sync_recording_to_calllog ON call_recordings;
    `);
    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS trigger_sync_recording_to_calllog_update ON call_recordings;
    `);
    console.log('✅ Old triggers removed\n');
    
    // Create new trigger for INSERT
    console.log('Step 3: Creating INSERT trigger...');
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER trigger_sync_recording_to_calllog
          BEFORE INSERT ON call_recordings
          FOR EACH ROW
          EXECUTE FUNCTION sync_recording_to_calllog();
    `);
    console.log('✅ INSERT trigger created\n');
    
    // Create trigger for UPDATE
    console.log('Step 4: Creating UPDATE trigger...');
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER trigger_sync_recording_to_calllog_update
          BEFORE UPDATE OF recording_url ON call_recordings
          FOR EACH ROW
          WHEN (OLD.recording_url IS NULL AND NEW.recording_url IS NOT NULL)
          EXECUTE FUNCTION sync_recording_to_calllog();
    `);
    console.log('✅ UPDATE trigger created\n');
    
    // Verify installation
    console.log('Step 5: Verifying installation...');
    const triggers = await prisma.$queryRaw`
      SELECT 
          trigger_name,
          event_manipulation,
          event_object_table
      FROM information_schema.triggers
      WHERE trigger_name LIKE '%sync_recording%'
    `;
    
    console.log('Installed triggers:');
    console.log(triggers);
    console.log('');
    
    console.log('='.repeat(80));
    console.log('✅ AUTO-SYNC TRIGGER INSTALLED SUCCESSFULLY!');
    console.log('='.repeat(80));
    console.log('');
    console.log('🎉 From now on:');
    console.log('   • New recordings in call_recordings table');
    console.log('   • Will AUTOMATICALLY sync to CallLog table');
    console.log('   • Appear in LMS UI instantly!');
    console.log('');
    console.log('📝 No more manual sync scripts needed!');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error setting up auto-sync:',error);
    console.error('\nIf you get permission errors, run this SQL manually in Supabase SQL Editor:');
    console.error('   File: setup-auto-sync-trigger.sql');
  } finally {
    await prisma.$disconnect();
  }
}

setupAutoSync();
