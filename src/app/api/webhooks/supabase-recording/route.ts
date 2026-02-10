import { NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { randomUUID } from 'crypto';

/**
 * Webhook endpoint for Supabase Storage to notify when a recording is uploaded
 * This automatically syncs recordings with LMS call logs
 * 
 * Accepts two types of payloads:
 * 1. Supabase webhook format (type: 'INSERT', record: {...})
 * 2. Direct format (phoneNumber, recordingUrl, duration)
 */
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    console.log('[Recording Sync Webhook] Received notification');
    console.log('Payload:', JSON.stringify(payload, null, 2));

    let phoneNumber: string;
    let recordingUrl: string;
    let duration: number | undefined;
    let fileName: string = '';

    // Handle direct payload from Call Monitor app
    if (payload.phoneNumber && payload.recordingUrl) {
      console.log('[Recording Sync Webhook] Direct format detected');
      phoneNumber = payload.phoneNumber;
      recordingUrl = payload.recordingUrl;
      duration = payload.duration;
      fileName = payload.fileName || recordingUrl.split('/').pop() || 'unknown';
    }
    // Handle Supabase webhook format
    else if (payload.type === 'INSERT' && payload.record) {
      console.log('[Recording Sync Webhook] Supabase webhook format detected');
      
      const { name: fName, bucket_id, metadata } = payload.record;
      fileName = fName;
      
      // Construct the public URL with proper encoding
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wkwrrdcjknvupwsfdjtd.supabase.co';
      // Encode the filename to handle spaces and special characters
      const encodedFileName = encodeURIComponent(fName);
      recordingUrl = `${supabaseUrl}/storage/v1/object/public/${bucket_id}/${encodedFileName}`;
      
      // Try to extract phone from metadata first, then filename
      phoneNumber = metadata?.phoneNumber;
      
      if (!phoneNumber) {
        // Extract phone number from filename
        // Expected format: "1770723282215_Call recording Ramesh Easy2work_260210_170348.m4a"
        const phoneMatch = fName.match(/(\d{10,})/);
        if (!phoneMatch) {
          console.log('[Recording Sync Webhook] ⚠️ Could not extract phone number');
          return NextResponse.json({ 
            success: false, 
            message: 'Could not extract phone number from filename or metadata',
            recordingUrl 
          });
        }
        // Get last 10 digits
        phoneNumber = phoneMatch[1].slice(-10);
      }
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid payload format',
        expectedFormats: {
          direct: { phoneNumber: '9360381404', recordingUrl: 'https://...', duration: 180 },
          supabase: { type: 'INSERT', record: { name: 'file.m4a', bucket_id: 'recordings' } }
        }
      }, { status: 400 });
    }

    console.log('[Recording Sync Webhook] 📞 Phone:', phoneNumber);
    console.log('[Recording Sync Webhook] 📁 File:', fileName);
    console.log('[Recording Sync Webhook] 🔗 URL:', recordingUrl);
    // Normalize phone number (last 10 digits)
    const normalizedPhone = phoneNumber.replace(/\D/g, '').slice(-10);

    // Search for lead with this phone number
    const lead = await prisma.lead.findFirst({
      where: {
        OR: [
          { phone: { endsWith: normalizedPhone } },
          { alternatePhone: { endsWith: normalizedPhone } }
        ]
      },
      select: {
        id: true,
        name: true,
        phone: true,
        assignedToId: true,
      }
    });

    if (!lead) {
      console.log('[Recording Sync Webhook] ❌ No matching lead found for phone:', normalizedPhone);
      return NextResponse.json({ 
        success: false, 
        message: 'No matching lead found',
        phoneNumber: normalizedPhone,
        recordingUrl,
        hint: 'Add this number as a lead in LMS to enable auto-sync'
      });
    }

    console.log('[Recording Sync Webhook] ✅ Found lead:', lead.name, `(${lead.id})`);

    // Check if there's a recent call log (within last 30 minutes) without recording
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    let callLog = await prisma.callLog.findFirst({
      where: {
        leadId: lead.id,
        createdAt: { gte: thirtyMinutesAgo },
        OR: [
          { recordingUrl: null },
          { recordingStatus: 'pending' }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (callLog) {
      // Update existing call log with recording
      console.log('[Recording Sync Webhook] 📝 Updating existing call log:', callLog.id);
      
      await prisma.callLog.update({
        where: { id: callLog.id },
        data: {
          recordingUrl,
          recordingStatus: 'available',
          duration: duration || callLog.duration,
          updatedAt: new Date(),
        }
      });

      console.log('[Recording Sync Webhook] ✅ Call log updated with recording!');
      
      return NextResponse.json({
        success: true,
        message: 'Recording linked to existing call log',
        callLogId: callLog.id,
        leadId: lead.id,
        leadName: lead.name,
        recordingUrl
      });
    }

    // No recent call log found - create a new one
    console.log('[Recording Sync Webhook] 📝 Creating new call log for lead:', lead.name);
    
    const newCallLog = await prisma.callLog.create({
      data: {
        id: randomUUID(),
        leadId: lead.id,
        callerId: lead.assignedToId || 'system',
        startedAt: new Date(),
        phoneDialed: normalizedPhone,
        callStatus: 'answer', // Assuming call was answered since we have a recording
        recordingUrl,
        recordingStatus: 'available',
        duration,
        attemptNumber: 1,
        remarks: 'Auto-synced from Call Monitor app'
      }
    });

    // Update lead's call attempts
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        callAttempts: { increment: 1 },
        updatedAt: new Date(),
      }
    });

    // Log activity
    await prisma.activityHistory.create({
      data: {
        id: randomUUID(),
        leadId: lead.id,
        userId: lead.assignedToId || 'system',
        action: 'call_logged',
        description: `Call recording auto-synced from Call Monitor app`,
      }
    });

    console.log('[Recording Sync Webhook] ✅ New call log created:', newCallLog.id);

    return NextResponse.json({
      success: true,
      message: 'Recording synced and new call log created',
      callLogId: newCallLog.id,
      leadId: lead.id,
      leadName: lead.name,
      recordingUrl
    });

  } catch (error) {
    console.error('[Recording Sync Webhook] ❌ Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for testing webhook configuration
 */
export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/webhooks/supabase-recording',
    message: 'Supabase recording webhook is ready',
    expectedPayload: {
      type: 'INSERT',
      record: {
        name: 'filename.m4a',
        bucket_id: 'recordings',
        metadata: {}
      }
    }
  });
}
