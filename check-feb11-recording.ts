import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecording() {
  console.log('Checking lead recording for Feb 11, 2026 12:36 PM call...\n');
  
  // Check for the lead with this approximate call time
  const { data: leads, error } = await supabase
    .from('Lead')
    .select('*')
    .or('name.ilike.%Gomathi%,name.ilike.%Adthi%,name.ilike.%Adithya%')
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Recent leads:');
  leads?.forEach(lead => {
    console.log(`\n========================================`);
    console.log(`Lead found:`);
    console.log(JSON.stringify(lead, null, 2));
  });
  
  // Also check storage for the file
  console.log('\n\nChecking storage for Feb 11 files...');
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
  
  console.log('\nRecent storage files:');
  files?.forEach(file => {
    console.log(`\n${file.name}`);
    console.log(`  Created: ${file.created_at}`);
    console.log(`  Size: ${file.metadata?.size || 0} bytes`);
  });
}

checkRecording();
