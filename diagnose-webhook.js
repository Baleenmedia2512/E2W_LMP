// Script to diagnose and fix Meta webhook subscription issues
const fs = require('fs');
const path = require('path');

// Simple .env parser
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        value = value.replace(/^["']|["']$/g, '');
        env[key] = value;
      }
    }
  });
  
  return env;
}

const env = loadEnv();
const ACCESS_TOKEN = env.META_ACCESS_TOKEN;
const PAGE_ID = env.META_PAGE_ID;
const APP_ID = env.META_APP_ID;

async function checkWebhookStatus() {
  console.log('🔍 Meta Webhook Status Check\n');
  console.log('='.repeat(60));

  try {
    // 1. Check app subscriptions to page
    console.log('\n1️⃣  Checking if app is subscribed to page...');
    const subsUrl = `https://graph.facebook.com/v21.0/${PAGE_ID}/subscribed_apps?access_token=${ACCESS_TOKEN}`;
    const subsResponse = await fetch(subsUrl);
    const subsData = await subsResponse.json();

    if (subsData.data && subsData.data.length > 0) {
      console.log('✅ App IS subscribed to page!');
      subsData.data.forEach(app => {
        console.log(`   App ID: ${app.id}`);
        console.log(`   App Name: ${app.name || 'Unknown'}`);
        console.log(`   Subscribed Fields: ${app.subscribed_fields?.join(', ') || 'None'}`);
        
        if (app.subscribed_fields?.includes('leadgen')) {
          console.log('   ✅ LEADGEN field is subscribed!');
        } else {
          console.log('   ❌ LEADGEN field is NOT subscribed!');
        }
      });
    } else {
      console.log('❌ App is NOT subscribed to page!');
      console.log('   This is why you\'re not receiving webhook events.');
    }

    // 2. Check webhook subscriptions in app
    console.log('\n2️⃣  Checking webhook subscriptions for app...');
    const webhookUrl = `https://graph.facebook.com/v21.0/${APP_ID}/subscriptions?access_token=${ACCESS_TOKEN}`;
    const webhookResponse = await fetch(webhookUrl);
    const webhookData = await webhookResponse.json();

    if (webhookData.data && webhookData.data.length > 0) {
      console.log('✅ Webhook subscriptions found:');
      webhookData.data.forEach(sub => {
        console.log(`   Object: ${sub.object}`);
        console.log(`   Callback URL: ${sub.callback_url}`);
        console.log(`   Active: ${sub.active}`);
        console.log(`   Fields: ${sub.fields?.map(f => f.name).join(', ') || 'None'}`);
      });
    } else {
      console.log('⚠️  No webhook subscriptions found in app');
    }

    // 3. Test webhook endpoint
    console.log('\n3️⃣  Testing webhook endpoint...');
    const testUrl = 'https://e2wleadmanager.vercel.app/api/webhooks/meta-leads?hub.mode=subscribe&hub.verify_token=E2W_LMP_META_WEBHOOK_2025&hub.challenge=test123';
    
    try {
      const testResponse = await fetch(testUrl);
      const challenge = await testResponse.text();
      
      if (challenge === 'test123') {
        console.log('✅ Webhook endpoint is working correctly!');
      } else {
        console.log('❌ Webhook endpoint not responding correctly');
        console.log(`   Expected: test123, Got: ${challenge}`);
      }
    } catch (error) {
      console.log('❌ Cannot reach webhook endpoint');
      console.log(`   Error: ${error.message}`);
    }

    // 4. Summary and recommendations
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY & RECOMMENDATIONS\n');

    const hasSubscription = subsData.data && subsData.data.length > 0;
    const hasLeadgen = subsData.data?.some(app => app.subscribed_fields?.includes('leadgen'));

    if (!hasSubscription) {
      console.log('❌ PROBLEM: App not subscribed to page');
      console.log('   SOLUTION: Run the fix command below\n');
      return { needsFix: true, reason: 'not_subscribed' };
    } else if (!hasLeadgen) {
      console.log('❌ PROBLEM: Leadgen field not subscribed');
      console.log('   SOLUTION: Run the fix command below\n');
      return { needsFix: true, reason: 'leadgen_not_subscribed' };
    } else {
      console.log('✅ Webhook appears configured correctly');
      console.log('   If still not receiving leads, check:');
      console.log('   1. Meta App Dashboard webhook logs');
      console.log('   2. Vercel deployment logs');
      console.log('   3. Meta may have disabled webhook due to errors\n');
      return { needsFix: false };
    }

  } catch (error) {
    console.error('❌ Error checking webhook status:', error);
    return { needsFix: true, reason: 'error', error: error.message };
  }
}

async function fixWebhookSubscription() {
  console.log('\n🔧 Attempting to fix webhook subscription...\n');

  try {
    // Subscribe app to page with leadgen field
    const subscribeUrl = `https://graph.facebook.com/v21.0/${PAGE_ID}/subscribed_apps`;
    const response = await fetch(subscribeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscribed_fields: ['leadgen'],
        access_token: ACCESS_TOKEN
      })
    });

    const result = await response.json();

    if (result.success === true) {
      console.log('✅ Successfully subscribed app to page with leadgen field!');
      console.log('\nNow test by submitting a lead form and check your database.');
      return true;
    } else {
      console.log('❌ Failed to subscribe:');
      console.log(JSON.stringify(result, null, 2));
      
      if (result.error) {
        console.log('\nError details:');
        console.log(`   Code: ${result.error.code}`);
        console.log(`   Type: ${result.error.type}`);
        console.log(`   Message: ${result.error.message}`);
        
        if (result.error.code === 190) {
          console.log('\n⚠️  Token issue detected!');
          console.log('   Your access token may be expired or invalid.');
          console.log('   Generate a new long-lived token from Meta.');
        }
      }
      return false;
    }

  } catch (error) {
    console.error('❌ Error fixing webhook:', error);
    return false;
  }
}

async function main() {
  // Validate environment variables
  if (!ACCESS_TOKEN || !PAGE_ID || !APP_ID) {
    console.error('❌ Missing environment variables!');
    console.error('   Required: META_ACCESS_TOKEN, META_PAGE_ID, META_APP_ID');
    process.exit(1);
  }

  console.log('🚀 Meta Webhook Diagnostic & Fix Tool\n');
  console.log(`Page ID: ${PAGE_ID}`);
  console.log(`App ID: ${APP_ID}`);
  console.log(`Token: ${ACCESS_TOKEN.substring(0, 20)}...`);

  // Check current status
  const status = await checkWebhookStatus();

  // Offer to fix if needed
  if (status.needsFix) {
    console.log('='.repeat(60));
    console.log('\n❓ Would you like to automatically fix this issue?');
    console.log('   This will subscribe your app to the page with leadgen field.\n');
    
    // Auto-fix (in a real scenario, you might want user confirmation)
    const fixed = await fixWebhookSubscription();
    
    if (fixed) {
      console.log('\n✅ Fix applied! Re-checking status...\n');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      await checkWebhookStatus();
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Done! ✨');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkWebhookStatus, fixWebhookSubscription };
