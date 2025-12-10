/**
 * Manual Webhook Test - Simulates Meta sending a lead
 * This helps verify if your webhook endpoint is processing leads correctly
 */

const WEBHOOK_URL = 'https://e2-w-lmp.vercel.app/api/webhooks/meta-leads';
const VERIFY_TOKEN = 'E2W_LMP_META_WEBHOOK_2025';

// Simulate a Meta lead webhook payload
const testPayload = {
  object: 'page',
  entry: [
    {
      id: '1552034478376801',
      time: Math.floor(Date.now() / 1000),
      changes: [
        {
          field: 'leadgen',
          value: {
            leadgen_id: `test_lead_${Date.now()}`,
            form_id: '1234567890',
            page_id: '1552034478376801',
            ad_id: '9876543210',
            adset_id: '5555555555',
            campaign_id: '3333333333',
            created_time: Math.floor(Date.now() / 1000).toString(),
          }
        }
      ]
    }
  ]
};

async function testWebhook() {
  console.log('\n🧪 MANUAL WEBHOOK TEST\n');
  console.log('='.repeat(60));
  console.log('\n📤 Sending test lead to webhook...\n');
  console.log('Payload:', JSON.stringify(testPayload, null, 2));
  console.log('\n' + '='.repeat(60) + '\n');

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Meta-Test-Client',
      },
      body: JSON.stringify(testPayload)
    });

    const data = await response.json();

    console.log('📥 Response Status:', response.status, response.statusText);
    console.log('📥 Response Body:', JSON.stringify(data, null, 2));

    if (response.status === 200) {
      console.log('\n✅ Webhook accepted the request!');
      
      if (data.success) {
        console.log('✅ Webhook processed successfully');
        if (data.processed > 0) {
          console.log(`✅ Processed ${data.processed} lead(s)`);
        }
        if (data.failed > 0) {
          console.log(`⚠️  Failed to process ${data.failed} lead(s)`);
        }
      }

      console.log('\n📊 Next steps:');
      console.log('  1. Check your database for the test lead');
      console.log('  2. Lead ID should be: ' + testPayload.entry[0].changes[0].value.leadgen_id);
      console.log('  3. Check Vercel logs for detailed processing info');
    } else {
      console.log('\n❌ Webhook rejected the request');
      console.log('Check the error message above');
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error: any) {
    console.error('\n❌ Error sending webhook test:', error.message);
    console.log('\n💡 Possible issues:');
    console.log('  - Webhook endpoint not accessible');
    console.log('  - Network connection issue');
    console.log('  - CORS or security policy blocking the request\n');
  }
}

// Run the test
testWebhook();
