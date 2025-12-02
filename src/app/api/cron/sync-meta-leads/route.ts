import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { findDuplicateLead, updateLeadWithMetaData } from '@/shared/lib/meta/deduplication';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Meta Leads Backup Sync (Safety Net Only)
 * 
 * PURPOSE: Backup to catch any leads that webhook might have missed
 * Webhook now fetches FULL data in real-time, so this is just a safety net
 * 
 * Schedule: Run every 30-60 minutes via DirectAdmin cron
 * URL: /api/cron/sync-meta-leads
 * 
 * NOTE: In normal operation, webhook handles everything in real-time.
 * This cron only catches edge cases (webhook failures, network issues, etc.)
 */

// Fetch campaign name from Meta Graph API
async function fetchCampaignName(campaignId: string): Promise<string | null> {
  try {
    const accessToken = process.env.META_ACCESS_TOKEN;
    if (!accessToken || !campaignId) return null;

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${campaignId}?fields=name&access_token=${accessToken}`,
      { method: 'GET' }
    );

    if (!response.ok) return null;
    
    const data = await response.json();
    return data.name || null;
  } catch (error) {
    console.error(`Error fetching campaign name for ${campaignId}:`, error);
    return null;
  }
}

// Round-robin assignment helper
async function getNextAgentForRoundRobin(): Promise<string | null> {
  try {
    const agents = await prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          name: {
            in: ['Agent', 'SuperAgent'],
          },
        },
      },
      select: { id: true },
    });

    if (agents.length === 0) return null;

    const lastLead = await prisma.lead.findFirst({
      where: { assignedToId: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { assignedToId: true },
    });

    if (!lastLead || !lastLead.assignedToId) {
      return agents[0]?.id || null;
    }

    const currentIndex = agents.findIndex(a => a.id === lastLead.assignedToId);
    const nextIndex = currentIndex === -1 || currentIndex === agents.length - 1 
      ? 0 
      : currentIndex + 1;

    return agents[nextIndex]?.id || null;
  } catch (error) {
    console.error('Error in round-robin assignment:', error);
    return null;
  }
}

// Fetch lead data from Meta Graph API
async function fetchLeadDataFromMeta(leadId: string, accessToken: string) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${leadId}?access_token=${accessToken}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      console.error(`Failed to fetch lead ${leadId}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching lead ${leadId}:`, error);
    return null;
  }
}

// Parse Meta lead field data
function parseMetaLeadFields(fieldData: any[]): {
  name: string;
  phone: string;
  email: string | null;
  customFields: Record<string, any>;
} {
  const result = {
    name: '',
    phone: '',
    email: null as string | null,
    customFields: {} as Record<string, any>,
  };

  for (const field of fieldData) {
    const fieldName = field.name.toLowerCase();
    const fieldValue = field.values[0];

    if (fieldName.includes('name') || fieldName === 'full_name') {
      result.name = fieldValue;
    } else if (fieldName.includes('phone') || fieldName === 'phone_number') {
      result.phone = fieldValue;
    } else if (fieldName.includes('email')) {
      result.email = fieldValue;
    } else {
      // Store other fields in customFields
      result.customFields[field.name] = fieldValue;
    }
  }

  return result;
}

export async function GET(request: NextRequest) {
  try {
    // Check if this is an external cron call or internal dashboard call
    const authHeader = request.headers.get('authorization');
    const referer = request.headers.get('referer');
    const cronSecret = process.env.CRON_SECRET;
    
    // Allow internal calls from the dashboard (same origin)
    const isInternalCall = referer && (referer.includes('localhost') || referer.includes(request.headers.get('host') || ''));
    
    // For external cron calls, verify the secret
    if (!isInternalCall && cronSecret && cronSecret.trim() && authHeader !== `Bearer ${cronSecret.trim()}`) {
      console.log('Auth failed - external call without valid token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = process.env.META_ACCESS_TOKEN;
    const pageId = process.env.META_PAGE_ID;

    if (!accessToken || !pageId) {
      return NextResponse.json(
        { error: 'META_ACCESS_TOKEN or META_PAGE_ID not configured' },
        { status: 500 }
      );
    }

    console.log('🔄 Starting Meta leads backup sync (safety net)...');

    // Step 1: Check for any old placeholder leads (shouldn't exist with new webhook)
    const placeholderLeads = await prisma.lead.findMany({
      where: {
        source: 'Meta',
        phone: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Process max 50 at a time
    });

    if (placeholderLeads.length > 0) {
      console.log(`⚠️ Found ${placeholderLeads.length} placeholder leads (webhook may have failed)`);

    let updatedCount = 0;

    for (const lead of placeholderLeads) {
      const metadata = lead.metadata as any;
      const metaLeadId = metadata?.metaLeadId;

      if (!metaLeadId) continue;

      // Fetch full lead data from Meta
      const leadData = await fetchLeadDataFromMeta(metaLeadId, accessToken);

      if (!leadData || !leadData.field_data) {
        console.log(`⚠️ No field data for lead ${metaLeadId}`);
        continue;
      }

      // Parse lead fields
      const parsed = parseMetaLeadFields(leadData.field_data);

      if (!parsed.phone) {
        console.log(`⚠️ No phone number for lead ${metaLeadId}`);
        continue;
      }

      // Fetch campaign name if available
      let campaignName = lead.campaign;
      if (metadata?.campaignId && (!campaignName || campaignName === metadata.campaignId)) {
        const fetchedName = await fetchCampaignName(metadata.campaignId);
        if (fetchedName) campaignName = fetchedName;
      }

      // Update the lead
      await updateLeadWithMetaData(lead.id, {
        name: parsed.name || `Meta Lead ${metaLeadId.substring(0, 8)}`,
        phone: parsed.phone,
        email: parsed.email,
        campaign: campaignName,
        customerRequirement: parsed.customFields.message || null,
        metadata: {
          ...metadata,
          ...parsed.customFields,
          needsDataFetch: false,
          dataFetchedAt: new Date().toISOString(),
        },
      });

      updatedCount++;
    }

    } else {
      console.log('✅ No placeholder leads found (webhook working correctly)');
    }

    // Step 2: Backup check - fetch any leads from last hour that webhook might have missed
    // Only check last hour since webhook should handle everything in real-time
    const since = Math.floor((Date.now() - 60 * 60 * 1000) / 1000); // Last 1 hour only

    // Fetch leads from Meta
    const leadsResponse = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/leadgen_forms?fields=leads.since(${since}){id,created_time,field_data}&access_token=${accessToken}`,
      { method: 'GET' }
    );

    if (!leadsResponse.ok) {
      const errorText = await leadsResponse.text();
      console.error('Failed to fetch leads from Meta:', leadsResponse.status, errorText);
      return NextResponse.json({
        success: true,
        updatedPlaceholders: updatedCount,
        newLeads: 0,
        message: `Placeholder update completed. Meta API error: ${leadsResponse.status}`,
        error: errorText,
      });
    }

    const formsData = await leadsResponse.json();
    let newLeadsCount = 0;
    let duplicatesSkipped = 0;

    if (formsData.data && formsData.data.length > 0) {
      for (const form of formsData.data) {
        if (!form.leads || !form.leads.data) continue;

        for (const metaLead of form.leads.data) {
          const metaLeadId = metaLead.id;
          const fieldData = metaLead.field_data;

          if (!fieldData || fieldData.length === 0) continue;

          // Parse fields
          const parsed = parseMetaLeadFields(fieldData);

          if (!parsed.phone) continue;

          // Check for duplicates (silently skip without logging)
          const duplicate = await findDuplicateLead(parsed.phone, parsed.email, metaLeadId);

          if (duplicate) {
            // Skip silently - duplicates are expected and normal
            duplicatesSkipped++;
            continue;
          }

          // Fetch campaign name if campaign ID exists in metadata
          let campaignName = null;
          const leadMetadata = metaLead.ad_id ? 
            await fetch(`https://graph.facebook.com/v21.0/${metaLead.ad_id}?fields=campaign_id&access_token=${accessToken}`)
              .then(r => r.ok ? r.json() : null)
              .catch(() => null) : null;
          
          if (leadMetadata?.campaign_id) {
            campaignName = await fetchCampaignName(leadMetadata.campaign_id);
          }

          // Create new lead
          const lead = await prisma.lead.create({
            data: {
              name: parsed.name || `Meta Lead ${metaLeadId.substring(0, 8)}`,
              phone: parsed.phone,
              email: parsed.email,
              source: 'Meta',
              campaign: campaignName,
              status: 'new',
              customerRequirement: parsed.customFields.message || null,
              notes: 'Lead fetched via Meta Graph API polling',
              metadata: {
                metaLeadId,
                formId: form.id,
                campaignId: leadMetadata?.campaign_id || null,
                ...parsed.customFields,
                submittedAt: metaLead.created_time,
                pollingFetched: new Date().toISOString(),
              } as any,
              assignedToId: await getNextAgentForRoundRobin(),
            },
          });

          // Log activity
          await prisma.activityHistory.create({
            data: {
              leadId: lead.id,
              userId: 'system',
              action: 'created',
              description: `Meta lead fetched via polling. Lead ID: ${metaLeadId}`,
            },
          });

          newLeadsCount++;
          console.log(`✅ New lead created: ${lead.id}`);
        }
      }
    }

    // Only log if there were actual changes
    if (updatedCount > 0 || newLeadsCount > 0) {
      console.log(`✅ Sync: ${newLeadsCount} new, ${updatedCount} updated, ${duplicatesSkipped} duplicates auto-ignored`);
    }

    return NextResponse.json({
      success: true,
      updatedPlaceholders: updatedCount,
      newLeads: newLeadsCount,
      duplicatesSkipped: duplicatesSkipped,
      message: 'Sync completed successfully',
    });
  } catch (error) {
    console.error('❌ Error in Meta sync:', error);
    return NextResponse.json(
      { success: false, error: 'Sync failed' },
      { status: 500 }
    );
  }
}
