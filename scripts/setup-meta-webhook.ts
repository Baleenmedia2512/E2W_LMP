/**
 * Meta Webhook Setup & Subscription Utility
 * 
 * This script automates the complete setup of Meta webhooks:
 * 1. Validates environment variables
 * 2. Tests access token validity
 * 3. Subscribes app to page
 * 4. Configures webhook fields (leadgen, leads_retrieval)
 * 5. Tests webhook endpoint
 * 6. Displays setup status
 * 
 * Usage:
 *   npm run setup-meta-webhook
 *   or
 *   npx tsx scripts/setup-meta-webhook.ts
 */

interface MetaApiResponse {
  success?: boolean;
  data?: any;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
  };
}

interface SetupResults {
  step: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

const results: SetupResults[] = [];

function logResult(step: string, status: 'success' | 'error' | 'warning', message: string, details?: any) {
  const icon = status === 'success' ? '✅' : status === 'error' ? '❌' : '⚠️';
  console.log(`${icon} ${step}: ${message}`);
  if (details) {
    console.log('   Details:', JSON.stringify(details, null, 2));
  }
  results.push({ step, status, message, details });
}

async function checkEnvironmentVariables(): Promise<boolean> {
  console.log('\n📋 Step 1: Checking Environment Variables\n');
  console.log('='.repeat(60));
  
  const required = [
    'META_ACCESS_TOKEN',
    'META_APP_SECRET',
    'META_WEBHOOK_VERIFY_TOKEN',
    'META_PAGE_ID',
    'NEXT_PUBLIC_APP_URL'
  ];
  
  const missing: string[] = [];
  const present: string[] = [];
  
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
      logResult('Environment', 'error', `Missing: ${key}`);
    } else {
      present.push(key);
      logResult('Environment', 'success', `Found: ${key}`);
    }
  }
  
  if (missing.length > 0) {
    console.log('\n❌ SETUP CANNOT CONTINUE\n');
    console.log('Missing environment variables:');
    missing.forEach(key => console.log(`  - ${key}`));
    console.log('\nPlease add them to your .env file or Vercel environment variables.');
    return false;
  }
  
  console.log('\n✅ All required environment variables are present\n');
  return true;
}

async function validateAccessToken(): Promise<boolean> {
  console.log('\n🔑 Step 2: Validating Access Token\n');
  console.log('='.repeat(60));
  
  const accessToken = process.env.META_ACCESS_TOKEN!;
  const pageId = process.env.META_PAGE_ID!;
  
  try {
    // Test 1: Check if token can access the page
    console.log('Testing page access...');
    const pageResponse = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}?fields=id,name,access_token&access_token=${accessToken}`
    );
    
    const pageData: MetaApiResponse = await pageResponse.json();
    
    if (pageData.error) {
      logResult('Token Validation', 'error', `Cannot access page: ${pageData.error.message}`, pageData.error);
      console.log('\n💡 Common fixes:');
      console.log('  - Ensure token has "pages_show_list" permission');
      console.log('  - Verify PAGE_ID is correct');
      console.log('  - Token must be a PAGE access token, not USER token');
      return false;
    }
    
    logResult('Page Access', 'success', `Connected to page: ${pageData.data?.name || pageId}`, {
      pageId: pageData.data?.id,
      pageName: pageData.data?.name
    });
    
    // Test 2: Debug token to check validity and permissions
    console.log('\nChecking token validity and permissions...');
    const debugResponse = await fetch(
      `https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`
    );
    
    const debugData = await debugResponse.json();
    
    if (debugData.error) {
      logResult('Token Debug', 'error', `Token validation failed: ${debugData.error.message}`);
      return false;
    }
    
    const tokenInfo = debugData.data;
    
    if (!tokenInfo.is_valid) {
      logResult('Token Validity', 'error', 'Access token is INVALID or EXPIRED');
      console.log('\n💡 Generate a new long-lived token:');
      console.log('  1. Go to Facebook Business Manager');
      console.log('  2. Business Settings → System Users');
      console.log('  3. Generate new token with required permissions');
      return false;
    }
    
    logResult('Token Validity', 'success', 'Access token is valid');
    
    // Check expiration
    if (tokenInfo.expires_at) {
      const expiresAt = new Date(tokenInfo.expires_at * 1000);
      const daysUntilExpiry = Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 7) {
        logResult('Token Expiry', 'warning', `Token expires in ${daysUntilExpiry} days on ${expiresAt.toLocaleDateString()}`, {
          expiresAt: expiresAt.toISOString(),
          daysRemaining: daysUntilExpiry
        });
      } else {
        logResult('Token Expiry', 'success', `Token valid for ${daysUntilExpiry} days`, {
          expiresAt: expiresAt.toISOString()
        });
      }
    } else {
      logResult('Token Expiry', 'success', 'Token is long-lived (no expiration)');
    }
    
    // Check permissions
    const requiredScopes = ['leads_retrieval', 'pages_show_list', 'pages_manage_metadata'];
    const tokenScopes = tokenInfo.scopes || [];
    const missingScopes = requiredScopes.filter(scope => !tokenScopes.includes(scope));
    
    if (missingScopes.length > 0) {
      logResult('Token Permissions', 'warning', `Missing permissions: ${missingScopes.join(', ')}`, {
        hasScopes: tokenScopes,
        missingScopes
      });
      console.log('\n⚠️  Some permissions are missing. Leads may not be retrievable.');
    } else {
      logResult('Token Permissions', 'success', 'All required permissions present', {
        scopes: tokenScopes
      });
    }
    
    return true;
  } catch (error: any) {
    logResult('Token Validation', 'error', `Unexpected error: ${error.message}`);
    return false;
  }
}

async function subscribeAppToPage(): Promise<boolean> {
  console.log('\n🔗 Step 3: Subscribing App to Page\n');
  console.log('='.repeat(60));
  
  const accessToken = process.env.META_ACCESS_TOKEN!;
  const pageId = process.env.META_PAGE_ID!;
  
  try {
    // Check current subscription status first
    console.log('Checking current subscription status...');
    const checkResponse = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/subscribed_apps?access_token=${accessToken}`
    );
    
    const checkData = await checkResponse.json();
    
    if (checkData.error) {
      logResult('Subscription Check', 'error', `Cannot check subscriptions: ${checkData.error.message}`, checkData.error);
      return false;
    }
    
    const currentSubscriptions = checkData.data || [];
    const isSubscribed = currentSubscriptions.length > 0;
    
    if (isSubscribed) {
      console.log('✅ App is already subscribed to page');
      currentSubscriptions.forEach((sub: any) => {
        logResult('Current Subscription', 'success', `App: ${sub.name || sub.id}`, {
          appId: sub.id,
          subscribedFields: sub.subscribed_fields || []
        });
      });
    } else {
      console.log('⚠️  App is NOT subscribed to page');
    }
    
    // Subscribe with required fields
    console.log('\nSubscribing app to page with leadgen field...');
    const subscribeResponse = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/subscribed_apps`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscribed_fields: ['leadgen'],
          access_token: accessToken
        })
      }
    );
    
    const subscribeData = await subscribeResponse.json();
    
    if (subscribeData.error) {
      logResult('App Subscription', 'error', `Subscription failed: ${subscribeData.error.message}`, subscribeData.error);
      console.log('\n💡 Common fixes:');
      console.log('  - Ensure token has "pages_manage_metadata" permission');
      console.log('  - Verify you have admin access to the page');
      console.log('  - Check if app is approved for "Lead Ads" product');
      return false;
    }
    
    if (subscribeData.success) {
      logResult('App Subscription', 'success', 'Successfully subscribed app to page with leadgen field', {
        fields: ['leadgen']
      });
      
      // Verify subscription
      console.log('\nVerifying subscription...');
      const verifyResponse = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/subscribed_apps?access_token=${accessToken}`
      );
      
      const verifyData = await verifyResponse.json();
      const subscriptions = verifyData.data || [];
      
      if (subscriptions.length > 0) {
        subscriptions.forEach((sub: any) => {
          const hasLeadgen = sub.subscribed_fields?.includes('leadgen');
          if (hasLeadgen) {
            logResult('Verification', 'success', '✅ LEADGEN field is subscribed!', {
              subscribedFields: sub.subscribed_fields
            });
          } else {
            logResult('Verification', 'warning', 'Subscription exists but LEADGEN not in fields', {
              subscribedFields: sub.subscribed_fields
            });
          }
        });
      }
      
      return true;
    } else {
      logResult('App Subscription', 'error', 'Subscription returned false', subscribeData);
      return false;
    }
  } catch (error: any) {
    logResult('App Subscription', 'error', `Unexpected error: ${error.message}`);
    return false;
  }
}

async function testWebhookEndpoint(): Promise<boolean> {
  console.log('\n🌐 Step 4: Testing Webhook Endpoint\n');
  console.log('='.repeat(60));
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://e2-w-lmp.vercel.app';
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN!;
  const webhookUrl = `${appUrl}/api/webhooks/meta-leads`;
  
  console.log(`Webhook URL: ${webhookUrl}`);
  
  try {
    // Test GET verification
    console.log('\nTesting GET verification (hub.challenge)...');
    const testChallenge = `test_${Date.now()}`;
    const verifyUrl = `${webhookUrl}?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=${testChallenge}`;
    
    const verifyResponse = await fetch(verifyUrl);
    const verifyResult = await verifyResponse.text();
    
    if (verifyResult === testChallenge) {
      logResult('Webhook Verification', 'success', 'Webhook endpoint responds correctly to verification', {
        url: webhookUrl,
        challengeTest: 'passed'
      });
    } else {
      logResult('Webhook Verification', 'error', `Webhook verification failed. Expected: ${testChallenge}, Got: ${verifyResult}`, {
        expected: testChallenge,
        received: verifyResult
      });
      return false;
    }
    
    // Test wrong token
    console.log('\nTesting security (wrong verify token)...');
    const wrongTokenUrl = `${webhookUrl}?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=test`;
    const wrongTokenResponse = await fetch(wrongTokenUrl);
    
    if (wrongTokenResponse.status === 403) {
      logResult('Security Test', 'success', 'Webhook correctly rejects invalid tokens');
    } else {
      logResult('Security Test', 'warning', `Expected 403, got ${wrongTokenResponse.status}`);
    }
    
    return true;
  } catch (error: any) {
    logResult('Webhook Test', 'error', `Cannot reach webhook endpoint: ${error.message}`, {
      url: webhookUrl,
      error: error.message
    });
    console.log('\n💡 Common fixes:');
    console.log('  - Ensure your app is deployed to production');
    console.log('  - Check NEXT_PUBLIC_APP_URL is correct');
    console.log('  - Verify HTTPS is enabled (required by Meta)');
    return false;
  }
}

async function displaySetupSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 SETUP SUMMARY');
  console.log('='.repeat(60) + '\n');
  
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const warningCount = results.filter(r => r.status === 'warning').length;
  
  console.log(`Total Checks: ${results.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`⚠️  Warnings: ${warningCount}`);
  console.log(`❌ Errors: ${errorCount}\n`);
  
  if (errorCount === 0) {
    console.log('🎉 META WEBHOOK SETUP COMPLETE!\n');
    console.log('Your webhook is ready to receive leads from Meta.');
    console.log('\nNext steps:');
    console.log('  1. Submit a test lead via your Facebook Lead Ad form');
    console.log('  2. Check Vercel logs: https://vercel.com/baleen-medias-projects/e2-w-lmp');
    console.log('  3. Verify lead appears in your database');
    console.log('\nMonitoring:');
    console.log(`  - Test endpoint: ${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/meta-leads/test`);
    console.log(`  - Webhook status: ${process.env.NEXT_PUBLIC_APP_URL}/api/webhook-status`);
  } else {
    console.log('⚠️  SETUP INCOMPLETE - Please fix the errors above\n');
    console.log('Errors found:');
    results.filter(r => r.status === 'error').forEach(r => {
      console.log(`  ❌ ${r.step}: ${r.message}`);
    });
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
}

async function main() {
  console.log('\n🚀 META WEBHOOK SETUP UTILITY\n');
  console.log('This script will configure your Meta webhook integration\n');
  
  try {
    // Step 1: Check environment variables
    const envOk = await checkEnvironmentVariables();
    if (!envOk) {
      process.exit(1);
    }
    
    // Step 2: Validate access token
    const tokenOk = await validateAccessToken();
    if (!tokenOk) {
      console.log('\n⚠️  Continuing with warnings, but token issues may prevent webhook from working\n');
    }
    
    // Step 3: Subscribe app to page
    const subscriptionOk = await subscribeAppToPage();
    if (!subscriptionOk) {
      console.log('\n❌ Subscription failed. Cannot continue.\n');
      await displaySetupSummary();
      process.exit(1);
    }
    
    // Step 4: Test webhook endpoint
    const webhookOk = await testWebhookEndpoint();
    if (!webhookOk) {
      console.log('\n⚠️  Webhook endpoint test failed, but subscription is complete\n');
    }
    
    // Display summary
    await displaySetupSummary();
    
    const hasErrors = results.some(r => r.status === 'error');
    process.exit(hasErrors ? 1 : 0);
  } catch (error: any) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the setup
main();
