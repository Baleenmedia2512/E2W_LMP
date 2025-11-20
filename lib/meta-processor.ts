import prisma from '@/lib/prisma';
import { createApiError } from '@/lib/api-middleware';

/**
 * Meta Lead Processor
 * 
 * Fetches complete lead data from Meta Graph API
 * and creates a lead in the CRM
 */

interface MetaLeadData {
  id: string;
  created_time: string;
  field_data: Array<{
    name: string;
    values: string[];
  }>;
  form_id?: string;
  ad_id?: string;
  campaign_id?: string;
}

/**
 * Process a Meta lead by fetching full details and creating in CRM
 */
export async function processMetaLead(webhookEventId: string, leadgenId: string) {
  try {
    console.log('[Meta Processor] Starting processing for leadgen:', leadgenId);

    // Get the webhook event
    const webhookEvent = await prisma.metaWebhookEvent.findUnique({
      where: { id: webhookEventId },
    });

    if (!webhookEvent) {
      throw new Error(`Webhook event ${webhookEventId} not found`);
    }

    if (webhookEvent.processed) {
      console.log('[Meta Processor] Already processed:', leadgenId);
      return;
    }

    // Get Meta access token
    const config = await prisma.metaConfig.findFirst({
      where: { isActive: true },
      select: { pageAccessToken: true },
    });

    if (!config) {
      throw new Error('No active Meta configuration found');
    }

    // Fetch lead details from Meta Graph API
    const leadData = await fetchMetaLeadDetails(leadgenId, config.pageAccessToken);

    if (!leadData) {
      throw new Error('Failed to fetch lead data from Meta');
    }

    console.log('[Meta Processor] Lead data fetched:', JSON.stringify(leadData, null, 2));

    // Extract field data
    const fields = extractLeadFields(leadData.field_data);

    // Validate required fields
    if (!fields.name && !fields.full_name) {
      throw new Error('Lead name is required');
    }

    if (!fields.phone && !fields.phone_number) {
      throw new Error('Lead phone is required');
    }

    // Prepare lead data for CRM
    const leadName = fields.full_name || fields.name || 'Unknown';
    const leadPhone = fields.phone_number || fields.phone || '';
    const leadEmail = fields.email || null;

    // Check if lead already exists by phone
    let existingLead = await prisma.lead.findFirst({
      where: { phone: leadPhone },
    });

    let lead;

    if (existingLead) {
      console.log('[Meta Processor] Lead already exists:', existingLead.id);
      
      // Update existing lead
      lead = await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          email: leadEmail || existingLead.email,
          source: 'Meta',
          campaign: leadData.campaign_id || existingLead.campaign,
          metadata: {
            ...(existingLead.metadata as any || {}),
            metaLeadgenId: leadgenId,
            metaFormId: leadData.form_id,
            metaAdId: leadData.ad_id,
            metaCampaignId: leadData.campaign_id,
            metaCreatedTime: leadData.created_time,
            metaFields: fields,
          },
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new lead
      lead = await prisma.lead.create({
        data: {
          name: leadName,
          phone: leadPhone,
          email: leadEmail,
          source: 'Meta',
          campaign: leadData.campaign_id || null,
          status: 'new',
          priority: 'medium',
          metadata: {
            metaLeadgenId: leadgenId,
            metaFormId: leadData.form_id,
            metaAdId: leadData.ad_id,
            metaCampaignId: leadData.campaign_id,
            metaCreatedTime: leadData.created_time,
            metaFields: fields,
          },
          // Don't assign to anyone initially - SuperAgent can assign manually
          assignedToId: null,
          createdById: null,
        },
      });

      console.log('[Meta Processor] New lead created:', lead.id);

      // Create notification for all SuperAgents
      const superAgents = await prisma.user.findMany({
        where: {
          role: { name: 'SuperAgent' },
          isActive: true,
        },
        select: { id: true },
      });

      if (superAgents.length > 0) {
        await prisma.notification.createMany({
          data: superAgents.map((agent) => ({
            userId: agent.id,
            type: 'meta_lead_received',
            title: 'New Meta Lead',
            message: `New lead "${leadName}" from Meta Lead Ads`,
            metadata: {
              leadId: lead.id,
              leadName: leadName,
              leadPhone: leadPhone,
              source: 'Meta',
              formId: leadData.form_id,
            },
          })),
        });

        console.log('[Meta Processor] Notifications created for SuperAgents');
      }
    }

    // Update webhook event as processed
    await prisma.metaWebhookEvent.update({
      where: { id: webhookEventId },
      data: {
        processed: true,
        processedAt: new Date(),
        leadId: lead.id,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'meta_lead_import',
        userId: lead.createdById || 'system',
        targetType: 'Lead',
        targetId: lead.id,
        changes: {
          metaLeadgenId: leadgenId,
          leadData: leadData,
        },
      },
    });

    console.log('[Meta Processor] Processing completed successfully for:', leadgenId);

    return lead;
  } catch (error) {
    console.error('[Meta Processor] Error processing lead:', error);

    // Update webhook event with error
    await prisma.metaWebhookEvent.update({
      where: { id: webhookEventId },
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
        processedAt: new Date(),
      },
    });

    throw error;
  }
}

/**
 * Fetch lead details from Meta Graph API
 */
async function fetchMetaLeadDetails(
  leadgenId: string,
  accessToken: string
): Promise<MetaLeadData | null> {
  try {
    const url = `https://graph.facebook.com/v18.0/${leadgenId}?access_token=${accessToken}`;

    console.log('[Meta API] Fetching lead details:', leadgenId);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Meta API] Error response:', errorData);
      throw new Error(
        `Meta API error: ${errorData.error?.message || 'Unknown error'}`
      );
    }

    const data = await response.json();
    return data as MetaLeadData;
  } catch (error) {
    console.error('[Meta API] Fetch error:', error);
    return null;
  }
}

/**
 * Extract and normalize lead fields from Meta field_data
 */
function extractLeadFields(fieldData: Array<{ name: string; values: string[] }>): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const field of fieldData) {
    const fieldName = field.name.toLowerCase();
    const value = field.values[0] || '';

    // Map common field names
    switch (fieldName) {
      case 'full_name':
      case 'name':
        fields.full_name = value;
        fields.name = value;
        break;
      case 'phone_number':
      case 'phone':
        fields.phone_number = value;
        fields.phone = value;
        break;
      case 'email':
        fields.email = value;
        break;
      case 'city':
        fields.city = value;
        break;
      case 'state':
        fields.state = value;
        break;
      case 'zip_code':
      case 'pincode':
        fields.pincode = value;
        break;
      case 'street_address':
      case 'address':
        fields.address = value;
        break;
      default:
        // Store any custom fields as-is
        fields[field.name] = value;
    }
  }

  return fields;
}

/**
 * Retry failed Meta lead processing
 */
export async function retryFailedMetaLeads() {
  try {
    console.log('[Meta Processor] Checking for failed leads to retry');

    // Get all unprocessed events older than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const failedEvents = await prisma.metaWebhookEvent.findMany({
      where: {
        processed: false,
        createdAt: {
          lt: fiveMinutesAgo,
        },
      },
      take: 10, // Process 10 at a time
    });

    console.log('[Meta Processor] Found failed events:', failedEvents.length);

    for (const event of failedEvents) {
      try {
        await processMetaLead(event.id, event.leadgenId);
      } catch (error) {
        console.error('[Meta Processor] Retry failed for:', event.leadgenId, error);
      }
    }
  } catch (error) {
    console.error('[Meta Processor] Retry job error:', error);
  }
}
