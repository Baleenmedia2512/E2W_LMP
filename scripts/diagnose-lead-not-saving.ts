/**
 * Check Recent Webhook Activity
 * This script checks Vercel logs to see if webhooks are being received
 */

console.log('\n📊 WEBHOOK DIAGNOSTIC - Why Leads Aren\'t Saving\n');
console.log('='.repeat(60) + '\n');

console.log('🔍 Common reasons leads don\'t save:\n');

console.log('1. ❌ DUPLICATE DETECTION');
console.log('   - Lead with same phone number already exists');
console.log('   - Lead with same Meta Lead ID already exists');
console.log('   - Solution: Use different phone number for testing\n');

console.log('2. ❌ WEBHOOK NOT RECEIVING POST REQUESTS');
console.log('   - Meta not sending webhooks to your endpoint');
console.log('   - Check Meta Dashboard → Webhooks → Recent Deliveries');
console.log('   - Should show 200 OK responses\n');

console.log('3. ❌ ENVIRONMENT VARIABLES MISSING IN PRODUCTION');
console.log('   - META_ACCESS_TOKEN not in Vercel');
console.log('   - Database credentials incorrect');
console.log('   - Solution: Add all env vars to Vercel Production\n');

console.log('4. ❌ LEAD DATA FETCH FAILING');
console.log('   - Meta API not returning lead details');
console.log('   - Access token expired or invalid');
console.log('   - Solution: Check token permissions\n');

console.log('='.repeat(60) + '\n');

console.log('📝 HOW TO DEBUG:\n');

console.log('✅ Step 1: Check if webhook is being called');
console.log('   Go to: https://vercel.com/baleen-medias-projects/e2-w-lmp');
console.log('   → Deployments → [Latest] → Runtime Logs');
console.log('   → Search for: "WEBHOOK POST RECEIVED"');
console.log('   → If you see this, webhook IS being called\n');

console.log('✅ Step 2: Check for duplicate messages');
console.log('   In Vercel logs, search for:');
console.log('   - "Duplicate detected by Meta Lead ID"');
console.log('   - "Duplicate detected by contact"');
console.log('   → If you see this, lead already exists!\n');

console.log('✅ Step 3: Check Meta Dashboard');
console.log('   Go to: https://developers.facebook.com/apps/');
console.log('   → Your App → Webhooks → Page');
console.log('   → Click "Recent Deliveries"');
console.log('   → Should show recent attempts with 200 OK\n');

console.log('✅ Step 4: Submit test with UNIQUE data');
console.log('   - Use a phone number that doesn\'t exist in DB');
console.log('   - Use a new email address');
console.log('   - Check immediately after submission\n');

console.log('='.repeat(60) + '\n');

async function checkRecentLeads() {
  console.log('📋 Checking recent leads in database...\n');

  try {
    const response = await fetch('https://e2-w-lmp.vercel.app/api/webhooks/meta-leads/test');
    const data = await response.json();

    if (data.checks?.databaseLeads) {
      const { totalMetaLeads, mostRecentLeadAt, recentLeads } = data.checks.databaseLeads;

      console.log(`Total Meta Leads: ${totalMetaLeads}`);
      console.log(`Most Recent: ${mostRecentLeadAt}\n`);

      if (recentLeads && recentLeads.length > 0) {
        console.log('Last 5 leads:');
        recentLeads.forEach((lead: any, i: number) => {
          console.log(`  ${i + 1}. ${lead.name} - ${lead.phone}`);
          console.log(`     Created: ${lead.createdAt}`);
          console.log(`     Source: ${lead.receivedVia}\n`);
        });
      }

      const lastLeadTime = new Date(mostRecentLeadAt);
      const now = new Date();
      const minutesAgo = Math.round((now.getTime() - lastLeadTime.getTime()) / (1000 * 60));

      console.log(`⏰ Last lead was ${minutesAgo} minutes ago`);

      if (minutesAgo > 60) {
        console.log('\n⚠️  No recent leads in last hour');
        console.log('   - Check if you submitted a test lead');
        console.log('   - Check Vercel logs for webhook calls');
        console.log('   - Verify Meta is sending webhooks');
      } else if (minutesAgo < 5) {
        console.log('\n✅ Recent lead found! Webhook appears to be working');
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error: any) {
    console.error('❌ Error fetching leads:', error.message);
  }
}

// Run the check
checkRecentLeads();

console.log('💡 TO FIX "LEAD NOT SAVING" ISSUE:\n');
console.log('1. Check Vercel logs (link above) for webhook activity');
console.log('2. Look for duplicate detection messages');
console.log('3. Submit test with UNIQUE phone number');
console.log('4. Wait 30 seconds and check database again');
console.log('5. If still not working, check Meta Dashboard "Recent Deliveries"\n');
