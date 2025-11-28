import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/shared/lib/db/prisma';

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

    console.log('🔍 Meta webhook verification:', { mode, token, challenge });

    // For now, accept any request with challenge (will add token check after confirming it works)
    if (mode === 'subscribe' && challenge) {
      console.log('✅ Webhook verified successfully');
      return new Response(challenge, { 
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    console.error('❌ Webhook verification failed - missing mode or challenge');
    return new Response('Forbidden', { status: 403 });
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

// POST: Receive lead data from Meta
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Verify signature
    if (signature) {
      const signatureHash = signature.split('=')[1];
      if (signatureHash && !verifySignature(rawBody, signatureHash)) {
        console.error('❌ Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);

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

            // Note: Meta webhook only sends IDs, not actual field data
            // You need to fetch full data using Graph API
            // For now, we'll create a placeholder and update via polling
            
            // Create metadata object
            const metadata = {
              metaLeadId,
              formId,
              pageId,
              adId,
              adgroupId,
              campaignId,
              submittedAt: new Date(parseInt(createdTime) * 1000).toISOString(),
              webhookReceived: new Date().toISOString(),
              needsDataFetch: true, // Flag for polling to fetch full data
            };

            // Check for duplicates
            const duplicate = await checkDuplicateLead('', null, metaLeadId);
            
            if (duplicate) {
              console.log(`⚠️ Duplicate lead skipped: ${metaLeadId}`);
              continue;
            }

            // Create placeholder lead (will be updated by polling with full data)
            const lead = await prisma.lead.create({
              data: {
                name: `Meta Lead ${metaLeadId.substring(0, 8)}`, // Placeholder
                phone: 'PENDING', // Will be updated by polling
                email: null,
                source: 'Meta',
                campaign: campaignId || null,
                status: 'new',
                priority: 'medium',
                notes: 'Lead received from Meta webhook. Full data pending fetch.',
                metadata: metadata as any,
                assignedToId: await getNextAgentForRoundRobin(),
              },
            });

            // Log activity
            await prisma.activityHistory.create({
              data: {
                leadId: lead.id,
                userId: 'system',
                action: 'created',
                description: `Meta lead received via webhook. Lead ID: ${metaLeadId}`,
              },
            });

            console.log(`✅ Lead placeholder created: ${lead.id}`);
          }
        }
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    
    // Return 200 to prevent Meta from retrying
    // Log error for manual review
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
