import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { normalizePhoneForStorage } from '@/shared/utils/phone';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Fetch campaign name from Meta Graph API
async function fetchCampaignName(campaignId: string, accessToken: string): Promise<string | null> {
  try {
    if (!campaignId) return null;
    
    console.log(`🔍 Fetching campaign name for ID: ${campaignId}`);
    
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${campaignId}?fields=name&access_token=${accessToken}`,
      { 
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to fetch campaign name for ${campaignId}: ${response.status} - ${errorText}`);
      console.error(`   This may be due to insufficient permissions or the campaign ID format`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.error(`❌ Meta API error fetching campaign ${campaignId}:`, data.error);
      return null;
    }
    
    if (data.name) {
      console.log(`✅ Campaign name fetched: "${data.name}" (ID: ${campaignId})`);
      return data.name;
    }
    
    console.warn(`⚠️ No name field in response for campaign ${campaignId}`);
    return null;
  } catch (error) {
    console.error(`❌ Error fetching campaign name for ${campaignId}:`, error);
    return null;
  }
}

// Check for duplicate leads
async function isDuplicate(phone: string, email: string | null, metaLeadId: string): Promise<boolean> {
  // Check by Meta Lead ID using JSON_EXTRACT for MySQL
  const existingByMetaId = await prisma.$queryRaw<any[]>`
    SELECT id FROM Lead 
    WHERE source = 'meta' 
    AND JSON_EXTRACT(metadata, '$.metaLeadId') = ${metaLeadId}
    LIMIT 1
  `;

  if (existingByMetaId && existingByMetaId.length > 0) return true;

  // Check by phone/email
  if (phone && phone !== 'PENDING') {
    const existingByContact = await prisma.lead.findFirst({
      where: {
        AND: [
          { source: 'meta' },
          {
            OR: [
              { phone: phone },
              ...(email ? [{ email: email }] : []),
            ],
          },
        ],
      },
    });

    if (existingByContact) return true;
  }

  return false;
}

// Get Gomathi's user ID
async function getGomathiUserId(): Promise<string | null> {
  try {
    const gomathi = await prisma.user.findUnique({
      where: { email: 'gomathi@baleenmedia.com' },
      select: { id: true, isActive: true },
    });

    if (gomathi && gomathi.isActive) {
      return gomathi.id;
    }

    // Fallback to first active agent
    const fallbackAgent = await prisma.user.findFirst({
      where: {
        isActive: true,
        Role: { name: { in: ['Agent', 'SuperAgent'] } },
      },
      select: { id: true },
    });

    return fallbackAgent?.id || null;
  } catch (error) {
    console.error('Error getting Gomathi user ID:', error);
    return null;
  }
}

// One-time backfill of missed Meta leads from past 3 days
export async function GET(request: NextRequest) {
  console.log('\n========================================');
  console.log('🔄 BACKFILL: Fetching missed Meta leads from past 3 days');
  console.log('========================================\n');

  try {
    const accessToken = process.env.META_ACCESS_TOKEN;
    const pageId = process.env.META_PAGE_ID;

    if (!accessToken || !pageId) {
      return NextResponse.json({ 
        error: 'META_ACCESS_TOKEN or META_PAGE_ID not configured' 
      }, { status: 500 });
    }

    // Calculate 3 days ago timestamp
    const threeDaysAgo = Math.floor(Date.now() / 1000) - (3 * 24 * 60 * 60);

    // Get all forms for the page
    const formsResponse = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/leadgen_forms?access_token=${accessToken}`,
      { method: 'GET' }
    );

    if (!formsResponse.ok) {
      const errorText = await formsResponse.text();
      return NextResponse.json({ 
        error: `Failed to fetch forms: ${errorText}` 
      }, { status: 500 });
    }

    const formsData = await formsResponse.json();
    const forms = formsData.data || [];

    console.log(`📋 Found ${forms.length} forms`);

    let totalProcessed = 0;
    let newLeads = 0;
    let duplicatesSkipped = 0;
    let errors = 0;

    // Process each form
    for (const form of forms) {
      console.log(`\n📝 Processing form: ${form.name} (${form.id})`);

      try {
        // Get leads for this form (filtered by time)
        const leadsResponse = await fetch(
          `https://graph.facebook.com/v21.0/${form.id}/leads?fields=id,created_time,field_data,ad_id,adgroup_id,campaign_id&access_token=${accessToken}`,
          { method: 'GET' }
        );

        if (!leadsResponse.ok) {
          console.error(`Failed to fetch leads for form ${form.id}`);
          continue;
        }

        const leadsData = await leadsResponse.json();
        const leads = leadsData.data || [];

        // Filter leads from past 3 days
        const recentLeads = leads.filter((lead: any) => {
          const createdTime = parseInt(lead.created_time);
          return createdTime >= threeDaysAgo;
        });

        console.log(`   Found ${recentLeads.length} leads from past 3 days`);

        // Process each lead
        for (const leadData of recentLeads) {
          totalProcessed++;

          try {
            const metaLeadId = leadData.id;
            const fieldData = leadData.field_data || [];
            const createdTime = leadData.created_time;
            const adId = leadData.ad_id;
            const adgroupId = leadData.adgroup_id;
            const campaignId = leadData.campaign_id;

            // Parse fields
            let name = '';
            let phone = '';
            let email: string | null = null;
            const customFields: Record<string, any> = {};

            for (const field of fieldData) {
              const fieldName = field.name.toLowerCase();
              const fieldValue = field.values[0];

              if (fieldName.includes('name') || fieldName === 'full_name') {
                name = fieldValue;
              } else if (fieldName.includes('phone') || fieldName === 'phone_number') {
                phone = normalizePhoneForStorage(fieldValue);
              } else if (fieldName.includes('email')) {
                email = fieldValue;
              } else {
                customFields[field.name] = fieldValue;
              }
            }

            if (!phone) {
              console.log(`   ⚠️  Skipping lead ${metaLeadId} - no phone number`);
              errors++;
              continue;
            }

            // Check for duplicates
            if (await isDuplicate(phone, email, metaLeadId)) {
              console.log(`   ⏭️  Skipping lead ${metaLeadId} - duplicate`);
              duplicatesSkipped++;
              continue;
            }

            // Fetch campaign name
            let campaignName = null;
            if (campaignId) {
              campaignName = await fetchCampaignName(campaignId, accessToken);
            }

            // Create metadata
            const metadata = {
              metaLeadId,
              formId: form.id,
              pageId,
              adId,
              adgroupId,
              campaignId,
              ...customFields,
              submittedAt: new Date(parseInt(createdTime) * 1000).toISOString(),
              backfilled: new Date().toISOString(),
            };

            // Get Gomathi's ID
            const assignedTo = await getGomathiUserId();

            // Create lead
            const campaignValue = campaignName || campaignId || null;
            const lead = await prisma.lead.create({
              data: {
                id: crypto.randomUUID(),
                name: name || `Meta Lead ${metaLeadId.substring(0, 8)}`,
                phone: phone,
                email: email,
                source: 'meta',
                campaign: campaignValue,
                status: 'new',
                customerRequirement: customFields.message || null,
                notes: 'Lead backfilled from Meta (past 3 days)',
                metadata: JSON.stringify(metadata),
                assignedToId: assignedTo,
                createdAt: new Date(parseInt(createdTime) * 1000), // Use original creation time
                updatedAt: new Date(),
              },
            });

            // Log activity
            await prisma.activityHistory.create({
              data: {
                id: crypto.randomUUID(),
                leadId: lead.id,
                userId: 'system',
                action: 'created',
                description: `Meta lead backfilled from past 3 days. Original submission: ${new Date(parseInt(createdTime) * 1000).toISOString()}`,
              },
            });

            console.log(`   ✅ Created lead: ${lead.name} (${lead.phone})`);
            newLeads++;
          } catch (leadError) {
            console.error(`   ❌ Error processing lead:`, leadError);
            errors++;
          }
        }
      } catch (formError) {
        console.error(`❌ Error processing form ${form.id}:`, formError);
        errors++;
      }
    }

    console.log('\n========================================');
    console.log('✅ BACKFILL COMPLETE');
    console.log(`   Processed: ${totalProcessed}`);
    console.log(`   New leads: ${newLeads}`);
    console.log(`   Duplicates skipped: ${duplicatesSkipped}`);
    console.log(`   Errors: ${errors}`);
    console.log('========================================\n');

    return NextResponse.json({
      success: true,
      totalProcessed,
      newLeads,
      duplicatesSkipped,
      errors,
      message: `Backfilled ${newLeads} new leads from past 3 days`,
    });
  } catch (error) {
    console.error('❌ Backfill error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Backfill failed' 
    }, { status: 500 });
  }
}
