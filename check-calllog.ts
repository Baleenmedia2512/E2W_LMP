import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCallLog() {
  console.log('Checking CallLog entries for adithyatest lead...\n');
  
  // First get the lead ID
  const { data: lead } = await supabase
    .from('Lead')
    .select('id, name, phone')
    .ilike('name', '%adithya%')
    .single();
  
  if (!lead) {
    console.log('Lead not found');
    return;
  }
  
  console.log(`Lead: ${lead.name} (${lead.phone})`);
  console.log(`Lead ID: ${lead.id}\n`);
  
  // Get CallLog entries
  const { data: callLogs, error } = await supabase
    .from('CallLog')
    .select('*')
    .eq('leadId', lead.id)
    .order('startedAt', { ascending: false });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${callLogs?.length || 0} call logs:\n`);
  
  callLogs?.forEach((log, index) => {
    console.log(`\n========== Call ${index + 1} ==========`);
    console.log(`ID: ${log.id}`);
    console.log(`Started: ${log.startedAt}`);
    console.log(`Duration: ${log.duration}s`);
    console.log(`Status: ${log.callStatus}`);
    console.log(`Recording URL: ${log.recordingUrl || 'NULL'}`);
    console.log(`Recording Status: ${log.recordingStatus}`);
    console.log(`Recording App Call ID: ${log.recordingAppCallId || 'NULL'}`);
    console.log(`Phone Dialed: ${log.phoneDialed}`);
    console.log(`Remarks: ${log.remarks}`);
  });
  
  // Check storage for files
  console.log('\n\n========== Storage Files ==========');
  const { data: files, error: storageError } = await supabase
    .storage
    .from('call-recordings')
    .list('', {
      sortBy: { column: 'created_at', order: 'desc' },
      limit: 20
    });
  
  if (storageError) {
    console.error('Storage Error:', storageError);
    return;
  }
  
  console.log(`\nFound ${files?.length || 0} files in storage:\n`);
  files?.forEach((file, index) => {
    console.log(`${index + 1}. ${file.name}`);
    console.log(`   Created: ${file.created_at}`);
    console.log(`   Size: ${file.metadata?.size || 0} bytes\n`);
  });
}

checkCallLog();
