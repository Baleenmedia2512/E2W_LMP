/**
 * Quick Webhook Health Check
 * 
 * Fast diagnostic to verify webhook status
 * 
 * Usage: npx tsx scripts/check-webhook-health.ts
 */

async function quickHealthCheck() {
  console.log('\n🏥 WEBHOOK HEALTH CHECK\n');
  console.log('='.repeat(60) + '\n');
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://e2-w-lmp.vercel.app';
  
  try {
    console.log('Fetching health status from test endpoint...\n');
    
    const response = await fetch(`${appUrl}/api/webhooks/meta-leads/test`);
    const data = await response.json();
    
    console.log('📋 Environment Variables:');
    Object.entries(data.checks?.environmentVariables?.details || {}).forEach(([key, value]) => {
      console.log(`   ${value ? '✅' : '❌'} ${key}`);
    });
    
    console.log('\n🔑 Access Token:');
    if (data.checks?.accessToken) {
      const token = data.checks.accessToken;
      console.log(`   Status: ${token.status === 'PASS' ? '✅' : '❌'} ${token.status}`);
      if (token.expiresAt) {
        console.log(`   Expires: ${token.expiresAt}`);
      }
      if (token.scopes) {
        console.log(`   Scopes: ${token.scopes.join(', ')}`);
      }
    }
    
    console.log('\n🔗 Webhook Subscription:');
    if (data.checks?.webhookSubscription) {
      const sub = data.checks.webhookSubscription;
      console.log(`   Status: ${sub.status === 'PASS' ? '✅' : '❌'} ${sub.status}`);
      if (sub.subscriptions) {
        sub.subscriptions.forEach((s: any) => {
          console.log(`   App: ${s.name || s.id}`);
          console.log(`   Fields: ${s.subscribedFields?.join(', ') || 'none'}`);
          const hasLeadgen = s.subscribedFields?.includes('leadgen');
          console.log(`   Leadgen: ${hasLeadgen ? '✅' : '❌'}`);
        });
      }
    }
    
    console.log('\n📊 Recent Leads:');
    if (data.checks?.databaseLeads) {
      const leads = data.checks.databaseLeads;
      console.log(`   Total Meta Leads: ${leads.totalMetaLeads || 0}`);
      console.log(`   Last Lead: ${leads.mostRecentLeadAt || 'Never'}`);
      if (leads.recentLeads && leads.recentLeads.length > 0) {
        console.log(`\n   Last 5 leads:`);
        leads.recentLeads.forEach((lead: any, i: number) => {
          console.log(`   ${i + 1}. ${lead.name} - ${lead.phone} (${lead.createdAt})`);
          console.log(`      Source: ${lead.receivedVia}`);
        });
      }
    }
    
    console.log('\n💡 Recommendations:');
    if (data.recommendations && data.recommendations.length > 0) {
      data.recommendations.forEach((rec: string) => {
        console.log(`   ${rec}`);
      });
    } else {
      console.log('   ✅ Everything looks good!');
    }
    
    console.log('\n📈 Overall Status:');
    console.log(`   ${data.summary?.overall === 'HEALTHY' ? '✅ HEALTHY' : '⚠️  ISSUES FOUND'}`);
    console.log(`   Checks: ${data.summary?.totalChecks || 0}`);
    console.log(`   Failed: ${data.summary?.failed || 0}`);
    
    console.log('\n' + '='.repeat(60) + '\n');
    
  } catch (error: any) {
    console.error('❌ Health check failed:', error.message);
    console.log('\n💡 Possible issues:');
    console.log('   - App not deployed or not accessible');
    console.log('   - NEXT_PUBLIC_APP_URL incorrect');
    console.log('   - Network connection issue');
    console.log('\n');
    process.exit(1);
  }
}

quickHealthCheck();
