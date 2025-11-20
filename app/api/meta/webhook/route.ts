import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { processMetaLead } from '@/lib/meta-processor';

/**
 * Meta Lead Ads Webhook Endpoint
 * 
 * Handles:
 * 1. GET - Webhook verification from Meta
 * 2. POST - Receiving leadgen events from Meta
 */

// ============================================
// GET - Webhook Verification
// ============================================
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Meta sends these parameters for verification
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    console.log('[Meta Webhook] Verification request received', {
      mode,
      token: token ? '***' : null,
      challenge: challenge ? '***' : null,
    });

    // Verify the mode and token
    if (mode === 'subscribe') {
      // Get verify token from database (first active config)
      const config = await prisma.metaConfig.findFirst({
        where: { isActive: true },
        select: { verifyToken: true },
      });

      if (!config) {
        console.error('[Meta Webhook] No active Meta config found');
        return NextResponse.json(
          { error: 'Webhook not configured' },
          { status: 403 }
        );
      }

      // Validate the verify token
      if (token === config.verifyToken) {
        console.log('[Meta Webhook] Verification successful');
        // Respond with the challenge token from the request
        return new NextResponse(challenge, { status: 200 });
      } else {
        console.error('[Meta Webhook] Verify token mismatch');
        return NextResponse.json(
          { error: 'Verification token mismatch' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid verification request' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Meta Webhook] Verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Receive Leadgen Events
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    console.log('[Meta Webhook] Event received', {
      hasSignature: !!signature,
      bodyLength: body.length,
    });

    // Validate signature
    if (!signature) {
      console.error('[Meta Webhook] Missing signature');
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 401 }
      );
    }

    // Get app secret from database
    const config = await prisma.metaConfig.findFirst({
      where: { isActive: true },
      select: { pageAccessToken: true },
    });

    if (!config) {
      console.error('[Meta Webhook] No active Meta config found');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    // Verify signature
    // Note: In production, store APP_SECRET separately, not with access token
    const appSecret = process.env.META_APP_SECRET || '';
    
    if (!appSecret) {
      console.error('[Meta Webhook] META_APP_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', appSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('[Meta Webhook] Signature validation failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the payload
    const payload = JSON.parse(body);
    console.log('[Meta Webhook] Payload parsed:', JSON.stringify(payload, null, 2));

    // Process each entry
    if (payload.object === 'page') {
      for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
          // Check if this is a leadgen event
          if (change.field === 'leadgen') {
            const leadgenData = change.value;
            const leadgenId = leadgenData.leadgen_id;
            const formId = leadgenData.form_id;
            const adId = leadgenData.ad_id;
            const pageId = leadgenData.page_id;

            console.log('[Meta Webhook] Leadgen event detected', {
              leadgenId,
              formId,
              adId,
              pageId,
            });

            // Check if already processed
            const existing = await prisma.metaWebhookEvent.findUnique({
              where: { leadgenId },
            });

            if (existing) {
              console.log('[Meta Webhook] Leadgen already processed:', leadgenId);
              continue;
            }

            // Store the webhook event
            const webhookEvent = await prisma.metaWebhookEvent.create({
              data: {
                leadgenId,
                formId,
                adId,
                pageId,
                payload: payload as any,
                processed: false,
              },
            });

            console.log('[Meta Webhook] Event stored:', webhookEvent.id);

            // Process the lead asynchronously (don't block webhook response)
            // In production, use a queue system like Bull, BullMQ, or AWS SQS
            processMetaLead(webhookEvent.id, leadgenId).catch((error) => {
              console.error('[Meta Webhook] Background processing error:', error);
            });
          }
        }
      }
    }

    // Always return 200 OK to Meta quickly
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Meta Webhook] Processing error:', error);
    // Still return 200 to prevent Meta from retrying
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
