import prisma from './src/shared/lib/db/prisma';

async function analyzeRecordingSync() {
  try {
    console.log('🔍 DEEP ANALYSIS: Why Recordings Are Not Syncing\n');
    console.log('═'.repeat(80));
    
    // Lead info
    const leadId = '12319766-5879-4019-abfb-d1c181b7b9d4';
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        name: true,
        phone: true,
        alternatePhone: true
      }
    });

    console.log('📋 LEAD INFORMATION:');
    console.log('   Name: ' + lead?.name);
    console.log('   Phone: ' + lead?.phone);
    console.log('   Phone (last 10): ' + lead?.phone.slice(-10));
    console.log('');

    // Call logs
    const calls = await prisma.callLog.findMany({
      where: { leadId: lead!.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        startedAt: true,
        phoneDialed: true,
        duration: true,
        recordingUrl: true,
        recordingStatus: true
      }
    });

    console.log('📞 CALL LOGS IN DATABASE:');
    calls.forEach((call, i) => {
      console.log(`   ${i + 1}. ${call.startedAt.toLocaleString()} - ${call.duration}s - Status: ${call.recordingStatus}`);
    });
    console.log('');

    console.log('🔴 ROOT CAUSE ANALYSIS:');
    console.log('─'.repeat(80));
    console.log('');
    
    console.log('✅ WHAT\'S WORKING:');
    console.log('   • Recordings ARE being uploaded to Supabase Storage');
    console.log('   • File visible in Supabase: "1770789394301_1770789394111_Call recording Adthi..."');
    console.log('   • Calls ARE being created in LMS database');
    console.log('   • 5 calls found with status "pending"');
    console.log('');
    
    console.log('❌ WHAT\'S BROKEN:');
    console.log('   • Recordings are NOT being linked to LMS calls');
    console.log('   • All calls have recordingUrl = NULL');
    console.log('   • Recording status stuck at "pending"');
    console.log('');

    console.log('🔍 THE PROBLEM:');
    console.log('─'.repeat(80));
    console.log('');
    console.log('Looking at the Supabase filename: "1770789394301_1770789394111_..."');
    console.log('');
    console.log('Phone numbers in filename:');
    console.log('   • 1770789394301 (13 digits - starts with 177)');
    console.log('   • 1770789394111 (13 digits - starts with 177)');
    console.log('');
    console.log('Lead phone in LMS:');
    console.log('   • 9360515518 (10 digits)');
    console.log('   • Last 10 of first number: ' + '1770789394301'.slice(-10));
    console.log('   • Last 10 of second number: ' + '1770789394111'.slice(-10));
    console.log('');
    
    const filePhone1 = '1770789394301'.slice(-10);
    const filePhone2 = '1770789394111'.slice(-10);
    const leadPhone = lead?.phone.slice(-10);
    
    if (filePhone1 !== leadPhone && filePhone2 !== leadPhone) {
      console.log('❌ PHONE NUMBER MISMATCH:');
      console.log('   The phone numbers in the recording filename DO NOT MATCH');
      console.log('   the lead\'s phone number in LMS!');
      console.log('');
      console.log('   Recording phones: ' + filePhone1 + ', ' + filePhone2);
      console.log('   Lead phone:       ' + leadPhone);
      console.log('');
      console.log('💡 SOLUTION 1: Phone Number Mismatch');
      console.log('   The Call Monitor app is recording a DIFFERENT phone number');
      console.log('   than what\'s stored in LMS. This could be:');
      console.log('   • The agent\'s phone number (7890394301)');
      console.log('   • A different contact number for the customer');
      console.log('   • The system needs to check BOTH phones in the filename');
    }
    
    console.log('');
    console.log('🔍 MISSING INTEGRATION:');
    console.log('─'.repeat(80));
    console.log('');
    console.log('The webhook endpoint exists at:');
    console.log('   /api/webhooks/supabase-recording');
    console.log('');
    console.log('But it\'s NOT being called because:');
    console.log('');
    console.log('❌ Supabase Storage webhook is NOT configured');
    console.log('   • Supabase needs a webhook to trigger on file upload');
    console.log('   • Or Call Monitor app needs to call the webhook after upload');
    console.log('');

    console.log('💡 SOLUTION 2: Missing Webhook Trigger');
    console.log('   Option A: Configure Supabase Storage webhook');
    console.log('      • Go to Supabase Dashboard > Database > Webhooks');
    console.log('      • Create webhook for "storage.objects" INSERT events');
    console.log('      • Point to: https://your-domain.com/api/webhooks/supabase-recording');
    console.log('');
    console.log('   Option B: Call Monitor app posts to webhook');
    console.log('      • After uploading to Supabase, Call Monitor should POST to:');
    console.log('      • https://e2wleadmanager.vercel.app/api/webhooks/supabase-recording');
    console.log('      • With payload: { phoneNumber, recordingUrl, duration }');
    console.log('');

    console.log('📊 VERIFICATION STEPS:');
    console.log('─'.repeat(80));
    console.log('');
    console.log('1. Check Vercel logs for webhook calls:');
    console.log('   • Look for "[Recording Sync Webhook] Received notification"');
    console.log('   • If missing, webhook is not being called');
    console.log('');
    console.log('2. Check Supabase webhook configuration:');
    console.log('   • Go to Supabase Dashboard > Database > Webhooks');
    console.log('   • Check if webhook is configured for storage events');
    console.log('');
    console.log('3. Test webhook manually:');
    console.log('   • POST to /api/webhooks/supabase-recording');
    console.log('   • With: { phoneNumber: "9360515518", recordingUrl: "..." }');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeRecordingSync();
