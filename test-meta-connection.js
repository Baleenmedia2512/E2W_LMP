// Test if Meta webhook is being called and if it can fetch lead data
const https = require('https');

// Your Meta credentials
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || 'EAAWnNnjnCxIBQOD8CHKD34TxdqDXY0meVqoH5i5wIjGiQZCgKMCQlZAF5SwAbNPPbCST8TkCtsQ8cS1LSbMit2KF6P51Eh1ijzG6TvnWrAotIpFIHZCySkZC7bnU9SyiaZCUUmDWjot3IjqkhLMHZBwh4LVrfn5rgiVHykTOKu6kq1OVxZCP4u8UqWtHVE8lajpPdVE3yYt';
const META_PAGE_ID = process.env.META_PAGE_ID || '1552034478376801';

console.log('\n🔍 Testing Meta API Connection...\n');
console.log('Page ID:', META_PAGE_ID);
console.log('Token (first 50 chars):', META_ACCESS_TOKEN.substring(0, 50) + '...');
console.log('\n=====================================\n');

// Check if we can fetch recent leads from Meta
const url = `https://graph.facebook.com/v18.0/${META_PAGE_ID}/leadgen_forms?access_token=${META_ACCESS_TOKEN}`;

https.get(url, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.error) {
        console.log('❌ ERROR accessing Meta API:');
        console.log(JSON.stringify(result.error, null, 2));
        console.log('\nPossible issues:');
        console.log('1. Access token expired or invalid');
        console.log('2. App doesn\'t have permission to page');
        console.log('3. Page ID is incorrect');
        return;
      }
      
      if (result.data && result.data.length > 0) {
        console.log(`✅ Found ${result.data.length} lead form(s) on this page:\n`);
        result.data.forEach((form, i) => {
          console.log(`${i + 1}. Form ID: ${form.id}`);
          console.log(`   Name: ${form.name || 'N/A'}`);
          
          // Try to get leads for this form
          const formUrl = `https://graph.facebook.com/v18.0/${form.id}/leads?access_token=${META_ACCESS_TOKEN}`;
          
          https.get(formUrl, (formRes) => {
            let formData = '';
            formRes.on('data', (chunk) => { formData += chunk; });
            formRes.on('end', () => {
              try {
                const leads = JSON.parse(formData);
                if (leads.data) {
                  console.log(`   Leads available: ${leads.data.length}`);
                  
                  if (leads.data.length > 0) {
                    console.log(`\n   Recent leads from this form:`);
                    leads.data.slice(0, 3).forEach((lead, j) => {
                      console.log(`   - Lead ${j + 1}: ${lead.id} (created: ${new Date(parseInt(lead.created_time) * 1000).toLocaleString()})`);
                    });
                  }
                }
              } catch (e) {
                console.log(`   Error fetching leads: ${e.message}`);
              }
            });
          });
        });
        
        console.log('\n=====================================');
        console.log('\n📝 Next Steps:');
        console.log('1. Go to Meta Business Manager → Webhooks');
        console.log('2. Check if webhook is subscribed to "leadgen" event');
        console.log('3. Verify callback URL: https://e2-w-lmp.vercel.app/api/webhooks/meta-leads');
        console.log('4. Submit a TEST lead in your Meta form');
        console.log('5. Check Vercel logs immediately: https://vercel.com/logs');
        console.log('\nIf you see logs in Vercel with "WEBHOOK POST RECEIVED", webhook is working!');
        console.log('If NOT, webhook is not subscribed or pointing to wrong URL.\n');
        
      } else {
        console.log('⚠️ No lead forms found on this page');
        console.log('\nThis could mean:');
        console.log('1. No lead forms created yet');
        console.log('2. Page ID is incorrect');
        console.log('3. App doesn\'t have access to this page\n');
      }
      
    } catch (e) {
      console.log('❌ Error parsing response:', e.message);
      console.log('Raw response:', data);
    }
  });
}).on('error', (e) => {
  console.log('❌ Network error:', e.message);
});
