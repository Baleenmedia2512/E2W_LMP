import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findRecording() {
  console.log('Finding the recording file...\n');
  
  // List all buckets
  console.log('1. All available buckets:');
  const { data: buckets, error: bucketsError } = await supabase
    .storage
    .listBuckets();
  
  if (bucketsError) {
    console.error('Error:', bucketsError);
    return;
  }
  
  buckets?.forEach(bucket => {
    console.log(`   - ${bucket.name} (public: ${bucket.public})`);
  });
  
  // Search for the file in each bucket
  console.log('\n2. Searching for recording file in each bucket...\n');
  const fileName = '1770794241423_1770794241393_Call recording Adthi E2W_260211_123633.m4a';
  
  for (const bucket of buckets || []) {
    console.log(`   Checking bucket: ${bucket.name}...`);
    
    // Try listing files in the root
    const { data: files, error } = await supabase
      .storage
      .from(bucket.name)
      .list('', { limit: 100 });
    
    if (!error && files && files.length > 0) {
      console.log(`     Found ${files.length} items in root`);
      
      // Check for the specific file
      const found = files.find(f => f.name === fileName);
      if (found) {
        console.log(`\n✅ FOUND! File is in bucket: ${bucket.name}`);
        console.log(`   Path: ${found.name}`);
        console.log(`   Size: ${found.metadata?.size} bytes`);
        
        // Get the correct URL
        const { data: urlData } = supabase
          .storage
          .from(bucket.name)
          .getPublicUrl(fileName);
        
        console.log(`\n   Correct URL: ${urlData.publicUrl}`);
        break;
      }
      
      // Also check subdirectories
      for (const item of files) {
        if (item.id === null) {  // This is a folder
          const { data: subFiles } = await supabase
            .storage
            .from(bucket.name)
            .list(item.name, { limit: 100 });
          
          if (subFiles) {
            const foundInSub = subFiles.find(f => f.name === fileName);
            if (foundInSub) {
              console.log(`\n✅ FOUND! File is in bucket: ${bucket.name}/${item.name}`);
              console.log(`   Path: ${item.name}/${foundInSub.name}`);
              
              const { data: urlData } = supabase
                .storage
                .from(bucket.name)
                .getPublicUrl(`${item.name}/${fileName}`);
              
              console.log(`\n   Correct URL: ${urlData.publicUrl}`);
              break;
            }
          }
        }
      }
    }
  }
}

findRecording();
