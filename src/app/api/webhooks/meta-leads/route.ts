import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/shared/lib/db/prisma';
import { normalizePhoneForStorage } from '@/shared/utils/phone';

// Make this route dynamic and disable static optimization
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Verify webhook signature from Meta
function verifySignature(payload: string, signature: string): boolean {
  const appSecret = process.env.META_APP_SECRET;
  
  if (!appSecret) {
    console.error('META_APP_SECRET not configured');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// GET: Webhook verification endpoint (Meta will call this once during setup)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');
    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

    console.log('🔍 Meta webhook verification request received');
    console.log('  Mode:', mode);
    console.log('  Token provided:', token ? 'YES' : 'NO');
    console.log('  Challenge provided:', challenge ? 'YES' : 'NO');
    console.log('  Expected token configured:', verifyToken ? 'YES' : 'NO');
    console.log('  Timestamp:', new Date().toISOString());

    // Verify the mode
    if (mode !== 'subscribe') {
      console.error('❌ Invalid mode:', mode);
      return new Response('Invalid mode', { status: 403 });
    }

    // Verify the token
    if (!verifyToken) {
      console.error('❌ META_WEBHOOK_VERIFY_TOKEN not configured in environment');
      return new Response('Server configuration error', { status: 500 });
    }

    if (token !== verifyToken.trim()) {
      console.error('❌ Token mismatch');
      console.error('  Received:', token);
      console.error('  Expected:', verifyToken.trim());
      return new Response('Invalid verify token', { status: 403 });
    }

    // All checks passed
    if (challenge) {
      console.log('✅ Webhook verified successfully');
      console.log('  Challenge being returned:', challenge);
      return new Response(challenge, { 
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    console.error('❌ No challenge provided');
    return new Response('No challenge', { status: 400 });
  } catch (error) {
    console.error('❌ Webhook verification error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Check for duplicate leads
async function checkDuplicateLead(phone: string, email: string | null, metaLeadId: string) {
  // First check by Meta Lead ID in metadata
  const allLeads = await prisma.lead.findMany({
    where: {
      source: 'Meta',
    },
  });

  const existingByMetaId = allLeads.find((lead) => {
    const metadata = lead.metadata as any;
    return metadata?.metaLeadId === metaLeadId;
  });

  if (existingByMetaId) {
    console.log(`Duplicate detected: Meta Lead ID ${metaLeadId} already exists`);
    return existingByMetaId;
  }

  // Then check by phone/email if provided
  if (phone && phone !== 'PENDING') {
    const existingByContact = await prisma.lead.findFirst({
      where: {
        OR: [
          { phone: phone },
          ...(email ? [{ email: email }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingByContact) {
      console.log(`Duplicate detected: Lead with phone ${phone} already exists`);
      return existingByContact;
    }
  }

  return null;
}

// Fetch campaign name from Meta Graph API
async function fetchCampaignName(campaignId: string): Promise<string | null> {
  try {
    const accessToken = process.env.META_ACCESS_TOKEN;
    if (!accessToken) {
      console.error('❌ META_ACCESS_TOKEN not configured for campaign name fetch');
      return null;
    }
    if (!campaignId) {
      console.error('❌ No campaignId provided to fetchCampaignName');
      return null;
    }

    console.log(`🔍 Fetching campaign name for ID: ${campaignId}`);
    
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${campaignId}?fields=name&access_token=${accessToken}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to fetch campaign name for ${campaignId}: ${response.status} - ${errorText}`);
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

// Get Gomathi's user ID for Meta lead assignment (US-5)
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
    console.warn('⚠️ Gomathi not found or inactive, falling back to first active agent');
    const fallbackAgent = await prisma.user.findFirst({
      where: {
        isActive: true,
        role: { name: { in: ['Agent', 'SuperAgent'] } },
      },
      select: { id: true },
    });

    return fallbackAgent?.id || null;
  } catch (error) {
    console.error('Error getting Gomathi user ID:', error);
    return null;
  }
}

// Round-robin assignment helper (kept for non-Meta leads)
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

// POST: Receive lead data from Meta
export async function POST(request: NextRequest) {
  const requestTimestamp = new Date().toISOString();
  console.log('\n========================================');
  console.log('📥 WEBHOOK POST RECEIVED');
  console.log('  Timestamp:', requestTimestamp);
  console.log('  URL:', request.url);
  console.log('========================================');
  
  try {
    // Log request headers for debugging
    const contentType = request.headers.get('content-type');
    const userAgent = request.headers.get('user-agent');
    const signature = request.headers.get('x-hub-signature-256');
    
    console.log('📋 Request Details:');
    console.log('  Content-Type:', contentType);
    console.log('  User-Agent:', userAgent);
    console.log('  Has Signature:', signature ? 'YES' : 'NO');
    console.log('  Origin:', request.headers.get('origin') || 'N/A');
    console.log('  Referer:', request.headers.get('referer') || 'N/A');

    // Clone request to read body multiple times
    const requestClone = request.clone();
    const rawBody = await request.text();
    
    console.log('\n📦 Body Analysis:');
    console.log('  Length:', rawBody.length, 'bytes');
    console.log('  Preview (first 500 chars):', rawBody.substring(0, 500));
    if (rawBody.length > 500) {
      console.log('  Preview (last 200 chars):', rawBody.substring(rawBody.length - 200));
    }

    // Handle empty body
    if (!rawBody || rawBody.trim().length === 0) {
      console.log('⚠️ Empty body received, returning success');
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Parse JSON
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('Raw body that failed to parse:', rawBody);
      console.error('Body type:', typeof rawBody);
      console.error('First 10 chars (codes):', [...rawBody.substring(0, 10)].map(c => c.charCodeAt(0)));
      // Return 200 to prevent Meta from retrying invalid requests
      return NextResponse.json({ 
        success: true, 
        message: 'Invalid JSON received, but acknowledged to prevent retries' 
      }, { status: 200 });
    }

    // Log parsed body structure
    console.log('Parsed body:', JSON.stringify(body, null, 2));

    // Verify signature (optional, only if signature is present)
    const signature = requestClone.headers.get('x-hub-signature-256');
    if (signature) {
      const signatureHash = signature.split('=')[1];
      if (signatureHash && !verifySignature(rawBody, signatureHash)) {
        console.error('❌ Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
      console.log('✅ Signature verified');
    }

    // Handle test notifications from Meta
    if (!body || typeof body !== 'object') {
      console.log('⚠️ Received non-object body, possibly test notification');
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Meta sends data in this structure
    if (body.object === 'page') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'leadgen') {
            const leadgenData = change.value;
            
            // Extract lead information
            const metaLeadId = leadgenData.leadgen_id;
            const formId = leadgenData.form_id;
            const pageId = leadgenData.page_id;
            const adId = leadgenData.ad_id;
            const adgroupId = leadgenData.adgroup_id;
            const campaignId = leadgenData.campaign_id;
            const createdTime = leadgenData.created_time;

            console.log(`📨 Received Meta lead: ${metaLeadId}`);

            try {
              // Fetch FULL lead data immediately from Meta Graph API
              const accessToken = process.env.META_ACCESS_TOKEN;
              if (!accessToken) {
                console.error('❌ META_ACCESS_TOKEN not configured');
                continue;
              }

              const leadResponse = await fetch(
                `https://graph.facebook.com/v21.0/${metaLeadId}?fields=id,created_time,field_data&access_token=${accessToken}`,
                { method: 'GET' }
              );

              if (!leadResponse.ok) {
                console.error(`❌ Failed to fetch lead data for ${metaLeadId}`);
                continue;
              }

              const leadData = await leadResponse.json();
              const fieldData = leadData.field_data || [];

              // Parse lead fields
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
                  // AC-3: Clean phone number for auto-imported leads from Meta
                  phone = normalizePhoneForStorage(fieldValue);
                } else if (fieldName.includes('email')) {
                  email = fieldValue;
                } else {
                  customFields[field.name] = fieldValue;
                }
              }

              // Validate required fields
              if (!phone) {
                console.error(`❌ No phone number for lead ${metaLeadId}`);
                continue;
              }

              // Check for duplicates (silently skip)
              const duplicate = await checkDuplicateLead(phone, email, metaLeadId);
              
              if (duplicate) {
                // Skip silently - duplicates are normal and expected
                continue;
              }

              // Fetch campaign name if campaign ID exists
              let campaignName = null;
              let finalCampaignId = campaignId;
              
              // If campaign ID not in webhook, try to fetch it from ad
              if (!finalCampaignId && adId) {
                console.log(`🔍 No campaign ID in webhook, fetching from ad: ${adId}`);
                try {
                  const adResponse = await fetch(
                    `https://graph.facebook.com/v21.0/${adId}?fields=campaign_id&access_token=${accessToken}`,
                    { method: 'GET' }
                  );
                  if (adResponse.ok) {
                    const adData = await adResponse.json();
                    finalCampaignId = adData.campaign_id;
                    console.log(`✅ Campaign ID from ad: ${finalCampaignId}`);
                  } else {
                    console.warn(`⚠️ Could not fetch campaign ID from ad ${adId}`);
                  }
                } catch (error) {
                  console.error(`❌ Error fetching campaign from ad:`, error);
                }
              }
              
              if (finalCampaignId) {
                console.log(`📊 Campaign ID: ${finalCampaignId}`);
                campaignName = await fetchCampaignName(finalCampaignId);
                if (campaignName) {
                  console.log(`✅ Campaign name resolved: "${campaignName}"`);
                } else {
                  console.warn(`⚠️ Could not fetch campaign name, will store ID: ${finalCampaignId}`);
                }
              } else {
                console.log('⚠️ No campaign ID available (not in webhook, no ad ID)');
              }

              // Create metadata object
              const metadata = {
                metaLeadId,
                formId,
                pageId,
                adId,
                adgroupId,
                campaignId: finalCampaignId, // Use the resolved campaign ID
                ...customFields,
                submittedAt: new Date(parseInt(createdTime) * 1000).toISOString(),
                webhookReceived: new Date().toISOString(),
                dataFetchedAt: new Date().toISOString(),
              };

              // Get Gomathi's ID for Meta lead assignment (US-5: Auto-assign to Gomathi)
              const assignedTo = await getGomathiUserId();
              console.log(`👤 Meta lead assigned to Gomathi: ${assignedTo || 'None'}`);

              // Create COMPLETE lead with full data
              const campaignValue = campaignName || finalCampaignId || null;
              const lead = await prisma.lead.create({
                data: {
                  name: name || `Meta Lead ${metaLeadId.substring(0, 8)}`,
                  phone: phone,
                  email: email,
                  source: 'Meta',
                  campaign: campaignValue,
                  status: 'new',
                  customerRequirement: customFields.message || null,
                  notes: 'Lead received via Meta webhook (real-time)',
                  metadata: metadata as any,
                  assignedToId: assignedTo,
                },
              });

              console.log(`✅ Lead created: ${lead.name} (${lead.phone}) - ID: ${lead.id}`);
              console.log(`📊 Campaign stored in DB: ${campaignValue ? `"${campaignValue}"` : 'NULL'}`);

              // Log activity
              await prisma.activityHistory.create({
                data: {
                  leadId: lead.id,
                  userId: 'system',
                  action: 'created',
                  description: `Meta lead received via webhook (real-time). Lead ID: ${metaLeadId}`,
                },
              });

              console.log(`✅ Activity logged for lead: ${lead.id}`);
            } catch (leadError) {
              console.error(`❌ Error creating lead ${metaLeadId}:`, leadError);
              // Continue to next lead
            }
          }
        }
      }

      console.log('\n✅ WEBHOOK PROCESSING COMPLETED SUCCESSFULLY');
      console.log('========================================\n');
      return NextResponse.json({ success: true, received: true }, { status: 200 });
    }

    console.log('\n✅ WEBHOOK ACKNOWLEDGED (no page object)');
    console.log('========================================\n');
    return NextResponse.json({ success: true, received: false }, { status: 200 });
  } catch (error) {
    console.error('\n❌ ERROR PROCESSING WEBHOOK:', error);
    console.error('========================================\n');
    
    // Return 200 to prevent Meta from retrying
    // Log error for manual review
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
