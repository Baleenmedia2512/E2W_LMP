import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/shared/lib/db/prisma';
import { normalizePhoneForStorage } from '@/shared/utils/phone';
import {
  fetchLeadData,
  fetchAllNames,
  parseLeadFields,
  validateAccessToken,
} from '@/shared/lib/meta/api';

// Make this route dynamic and disable static optimization
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Enhanced logging utility
 */
function logWebhookEvent(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📥',
    warn: '⚠️',
    error: '❌',
  }[level];

  console.log(`[${timestamp}] ${prefix} ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

/**
 * Verify webhook signature from Meta
 */
function verifySignature(payload: string, signature: string): boolean {
  const appSecret = process.env.META_APP_SECRET;
  
  if (!appSecret) {
    logWebhookEvent('error', 'META_APP_SECRET not configured');
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    logWebhookEvent('error', 'Signature verification failed', error);
    return false;
  }
}

/**
 * GET: Webhook verification endpoint (Meta calls this during setup)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');
    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

    logWebhookEvent('info', 'Webhook verification request received', {
      mode,
      hasToken: !!token,
      hasChallenge: !!challenge,
      hasExpectedToken: !!verifyToken,
    });

    // Verify the mode
    if (mode !== 'subscribe') {
      logWebhookEvent('error', 'Invalid mode', { mode });
      return new Response('Invalid mode', { status: 403 });
    }

    // Verify the token
    if (!verifyToken) {
      logWebhookEvent('error', 'META_WEBHOOK_VERIFY_TOKEN not configured');
      return new Response('Server configuration error', { status: 500 });
    }

    if (token !== verifyToken.trim()) {
      logWebhookEvent('error', 'Token mismatch', {
        received: token?.substring(0, 10) + '...',
        expected: verifyToken.trim().substring(0, 10) + '...',
      });
      return new Response('Invalid verify token', { status: 403 });
    }

    // All checks passed
    if (challenge) {
      const duration = Date.now() - startTime;
      logWebhookEvent('info', `✅ Webhook verified successfully (${duration}ms)`, {
        challengeLength: challenge.length,
      });
      return new Response(challenge, { 
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    logWebhookEvent('error', 'No challenge provided');
    return new Response('No challenge', { status: 400 });
  } catch (error) {
    const duration = Date.now() - startTime;
    logWebhookEvent('error', `Webhook verification error (${duration}ms)`, error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * Check for duplicate leads
 */
async function checkDuplicateLead(phone: string, email: string | null, metaLeadId: string) {
  try {
    // Check by Meta Lead ID using PostgreSQL JSON operators
    const existingByMetaId = await prisma.$queryRaw<any[]>`
      SELECT id, name, phone FROM "Lead" 
      WHERE source = 'meta' 
      AND metadata::jsonb->>'metaLeadId' = ${metaLeadId}
      LIMIT 1
    `;

    if (existingByMetaId && existingByMetaId.length > 0) {
      logWebhookEvent('info', `Duplicate detected by Meta Lead ID: ${metaLeadId}`);
      return existingByMetaId[0];
    }

    // Then check by phone/email if provided
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
        orderBy: { createdAt: 'desc' },
      });

      if (existingByContact) {
        logWebhookEvent('info', `Duplicate detected by contact: ${phone}`);
        return existingByContact;
      }
    }

    return null;
  } catch (error) {
    logWebhookEvent('error', 'Error checking for duplicates', error);
    return null;
  }
}

/**
 * Get Gomathi's user ID for Meta lead assignment (US-5)
 */
async function getGomathiUserId(): Promise<string | null> {
  try {
    const gomathi = await prisma.user.findUnique({
      where: { email: 'gomathi@baleenmedia.com' },
      select: { id: true, isActive: true },
    });

    if (gomathi && gomathi.isActive) {
      return gomathi.id;
    }

    // Fallback: if Gomathi is not found or inactive, get first active agent
    logWebhookEvent('warn', 'Gomathi not found or inactive, using fallback agent');
    const fallbackAgent = await prisma.user.findFirst({
      where: {
        isActive: true,
        Role: { name: { in: ['Agent', 'SuperAgent'] } },
      },
      select: { id: true },
    });

    return fallbackAgent?.id || null;
  } catch (error) {
    logWebhookEvent('error', 'Error getting Gomathi user ID', error);
    return null;
  }
}

/**
 * Process a single lead from webhook
 */
async function processLead(leadgenData: any): Promise<void> {
  const metaLeadId = leadgenData.leadgen_id;
  const formId = leadgenData.form_id;
  const pageId = leadgenData.page_id;
  const createdTime = leadgenData.created_time;

  // IDs from webhook (may be missing)
  const webhookAdId = leadgenData.ad_id;
  const webhookAdsetId = leadgenData.adgroup_id; // Note: Meta uses 'adgroup_id' in webhook
  const webhookCampaignId = leadgenData.campaign_id;

  logWebhookEvent('info', `Processing lead: ${metaLeadId}`, {
    formId,
    pageId,
    webhookAdId,
    webhookAdsetId,
    webhookCampaignId,
  });

  try {
    // STEP 1: Fetch FULL lead data from Meta Graph API
    // This includes: ad_id, adset_id, campaign_id, form_id, field_data
    logWebhookEvent('info', `Fetching complete lead data from Meta API...`);
    const leadData = await fetchLeadData(metaLeadId);

    if (!leadData) {
      logWebhookEvent('error', `Failed to fetch lead data for ${metaLeadId}`);
      throw new Error('Failed to fetch lead data from Meta API');
    }

    // Use IDs from API response, fallback to webhook data
    const adId = leadData.ad_id || webhookAdId;
    const adsetId = leadData.adset_id || webhookAdsetId;
    const campaignId = leadData.campaign_id || webhookCampaignId;

    logWebhookEvent('info', 'Lead data received', {
      hasAdId: !!adId,
      hasAdsetId: !!adsetId,
      hasCampaignId: !!campaignId,
      fieldsCount: leadData.field_data?.length || 0,
    });

    // STEP 2: Parse lead fields (name, phone, email, custom fields)
    const { name, phone, email, customFields } = parseLeadFields(leadData.field_data || []);

    // Normalize phone number
    const normalizedPhone = phone ? normalizePhoneForStorage(phone) : '';

    // Validate required fields
    if (!normalizedPhone) {
      logWebhookEvent('error', `No phone number for lead ${metaLeadId}`);
      throw new Error('Lead missing phone number');
    }

    // STEP 3: Check for duplicates
    const duplicate = await checkDuplicateLead(normalizedPhone, email, metaLeadId);
    
    if (duplicate) {
      logWebhookEvent('info', `Skipping duplicate lead ${metaLeadId}`);
      return; // Skip silently
    }

    // STEP 4: Fetch campaign, adset, and ad names in parallel
    logWebhookEvent('info', 'Fetching campaign/adset/ad names...');
    const { campaignName, adsetName, adName } = await fetchAllNames(
      campaignId,
      adsetId,
      adId
    );

    // STEP 5: Create metadata object with all available information
    const metadata = {
      metaLeadId,
      formId,
      pageId,
      adId,
      adsetId,
      campaignId,
      adName,
      adsetName,
      campaignName,
      ...customFields,
      submittedAt: new Date(parseInt(createdTime) * 1000).toISOString(),
      webhookReceived: new Date().toISOString(),
      dataFetchedAt: new Date().toISOString(),
    };

    // STEP 6: Get agent assignment (Gomathi for Meta leads)
    const assignedTo = await getGomathiUserId();
    
    if (!assignedTo) {
      logWebhookEvent('warn', 'No agent available for assignment');
    }

    // STEP 7: Determine campaign value for DB storage
    // Priority: campaignName > campaignId > null
    const campaignValue = campaignName || campaignId || null;

    // STEP 8: Create lead in database
    const lead = await prisma.lead.create({
      data: {
        id: crypto.randomUUID(),
        name: name || `Meta Lead ${metaLeadId.substring(0, 8)}`,
        phone: normalizedPhone,
        email: email,
        source: 'meta',
        campaign: campaignValue,
        status: 'new',
        customerRequirement: customFields.message || customFields.comments || null,
        notes: 'Lead received via Meta webhook (real-time)',
        metadata: JSON.stringify(metadata),
        assignedToId: assignedTo,
        updatedAt: new Date(),
      },
    });

    logWebhookEvent('info', `✅ Lead created successfully`, {
      leadId: lead.id,
      name: lead.name,
      phone: lead.phone,
      campaign: campaignValue,
      assignedTo: assignedTo || 'unassigned',
    });

    // STEP 9: Log activity
    await prisma.activityHistory.create({
      data: {
        id: crypto.randomUUID(),
        leadId: lead.id,
        userId: 'system',
        action: 'created',
        description: `Meta lead received via webhook. Lead ID: ${metaLeadId}. Campaign: ${campaignName || campaignId || 'Unknown'}. Ad: ${adName || adId || 'Unknown'}.`,
      },
    });

    logWebhookEvent('info', `✅ Activity logged for lead ${lead.id}`);
  } catch (error: any) {
    logWebhookEvent('error', `Failed to process lead ${metaLeadId}`, {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * POST: Receive lead data from Meta
 */
export async function POST(request: NextRequest) {
  const requestTimestamp = new Date().toISOString();
  const startTime = Date.now();
  
  logWebhookEvent('info', '========================================');
  logWebhookEvent('info', 'WEBHOOK POST RECEIVED', {
    timestamp: requestTimestamp,
    url: request.url,
  });
  logWebhookEvent('info', '========================================');
  
  try {
    // STEP 1: Log request metadata
    const contentType = request.headers.get('content-type');
    const userAgent = request.headers.get('user-agent');
    const hubSignature = request.headers.get('x-hub-signature-256');
    
    logWebhookEvent('info', 'Request headers', {
      contentType,
      userAgent,
      hasSignature: !!hubSignature,
      origin: request.headers.get('origin') || 'N/A',
      referer: request.headers.get('referer') || 'N/A',
    });

    // STEP 2: Read and log raw body
    const rawBody = await request.text();
    
    logWebhookEvent('info', 'Request body', {
      length: rawBody.length,
      preview: rawBody.substring(0, 500),
      ...(rawBody.length > 500 && { tail: rawBody.substring(rawBody.length - 200) }),
    });

    // Handle empty body
    if (!rawBody || rawBody.trim().length === 0) {
      logWebhookEvent('warn', 'Empty body received, returning success');
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // STEP 3: Parse JSON
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError: any) {
      logWebhookEvent('error', 'JSON parse error', {
        error: parseError.message,
        bodyType: typeof rawBody,
        firstChars: rawBody.substring(0, 100),
      });
      // Return 200 to prevent Meta from retrying invalid requests
      return NextResponse.json({ 
        success: true, 
        message: 'Invalid JSON received, but acknowledged to prevent retries' 
      }, { status: 200 });
    }

    logWebhookEvent('info', 'Parsed body', body);

    // STEP 4: Verify signature (if present)
    if (hubSignature) {
      const signatureHash = hubSignature.split('=')[1];
      if (signatureHash && !verifySignature(rawBody, signatureHash)) {
        logWebhookEvent('error', 'Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
      logWebhookEvent('info', '✅ Signature verified');
    } else {
      logWebhookEvent('warn', 'No signature in request (might be test request)');
    }

    // STEP 5: Validate body structure
    if (!body || typeof body !== 'object') {
      logWebhookEvent('warn', 'Non-object body received, possibly test notification');
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // STEP 6: Process leadgen webhooks
    if (body.object === 'page') {
      const processedLeads: string[] = [];
      const failedLeads: string[] = [];

      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const leadgenData = change.value;
            const metaLeadId = leadgenData.leadgen_id;

            try {
              await processLead(leadgenData);
              processedLeads.push(metaLeadId);
            } catch (error: any) {
              logWebhookEvent('error', `Failed to process lead ${metaLeadId}`, error);
              failedLeads.push(metaLeadId);
              // Continue to next lead instead of failing entire webhook
            }
          }
        }
      }

      const duration = Date.now() - startTime;
      logWebhookEvent('info', `✅ WEBHOOK PROCESSING COMPLETED (${duration}ms)`, {
        processed: processedLeads.length,
        failed: failedLeads.length,
        processedLeads,
        failedLeads,
      });

      return NextResponse.json({ 
        success: true, 
        received: true,
        processed: processedLeads.length,
        failed: failedLeads.length,
      }, { status: 200 });
    }

    const duration = Date.now() - startTime;
    logWebhookEvent('info', `✅ WEBHOOK ACKNOWLEDGED (no page object) (${duration}ms)`);
    return NextResponse.json({ success: true, received: false }, { status: 200 });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logWebhookEvent('error', `ERROR PROCESSING WEBHOOK (${duration}ms)`, {
      error: error.message,
      stack: error.stack,
    });
    
    // Return 200 to prevent Meta from retrying
    return NextResponse.json({ 
      success: true,
      error: 'Internal error logged for review',
    }, { status: 200 });
  }
}
