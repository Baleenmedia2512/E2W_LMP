/**
 * Pre-flight Check for Meta Webhook Setup
 * Checks if credentials are available and guides user
 */

console.log('\n🔍 META WEBHOOK PRE-FLIGHT CHECK\n');
console.log('='.repeat(60) + '\n');

const required = {
  'META_ACCESS_TOKEN': 'Your Page Access Token from Facebook Business Manager',
  'META_APP_SECRET': 'Your App Secret from Facebook Developer Console',
  'META_PAGE_ID': 'Your Facebook Page ID',
  'META_WEBHOOK_VERIFY_TOKEN': 'Webhook verification token (should be: E2W_LMP_META_WEBHOOK_2025)',
  'NEXT_PUBLIC_APP_URL': 'Your production URL (should be: https://e2-w-lmp.vercel.app)'
};

let allPresent = true;
let hasPlaceholders = false;

console.log('📋 Environment Variables Status:\n');

for (const [key, description] of Object.entries(required)) {
  const value = process.env[key];
  
  if (!value) {
    console.log(`❌ ${key}`);
    console.log(`   Missing: ${description}\n`);
    allPresent = false;
  } else if (value.includes('PASTE_YOUR') || value.includes('your-')) {
    console.log(`⚠️  ${key}`);
    console.log(`   Found but looks like placeholder: ${value}\n`);
    hasPlaceholders = true;
    allPresent = false;
  } else {
    const maskedValue = key.includes('TOKEN') || key.includes('SECRET') 
      ? value.substring(0, 10) + '...' + value.substring(value.length - 10)
      : value;
    console.log(`✅ ${key}`);
    console.log(`   Value: ${maskedValue}\n`);
  }
}

console.log('='.repeat(60) + '\n');

if (!allPresent) {
  console.log('❌ SETUP CANNOT PROCEED\n');
  
  console.log('📝 NEXT STEPS:\n');
  console.log('1. If running LOCALLY:');
  console.log('   - Edit .env.meta file');
  console.log('   - Add your actual Meta credentials');
  console.log('   - Run: .\\setup-meta.ps1\n');
  
  console.log('2. If deploying to PRODUCTION (Vercel):');
  console.log('   - Go to: https://vercel.com/baleen-medias-projects/e2-w-lmp');
  console.log('   - Settings → Environment Variables');
  console.log('   - Add all 4 Meta variables');
  console.log('   - Redeploy your app');
  console.log('   - Then run setup script in production\n');
  
  console.log('📖 DETAILED GUIDE:');
  console.log('   See URGENT_META_FIX.md for step-by-step instructions\n');
  
  process.exit(1);
}

console.log('✅ ALL CREDENTIALS PRESENT!\n');
console.log('You can now proceed with webhook setup.\n');
console.log('Run: npm run setup:meta-webhook\n');
console.log('='.repeat(60) + '\n');
