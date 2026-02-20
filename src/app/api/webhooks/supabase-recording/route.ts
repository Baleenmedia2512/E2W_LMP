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
    let callTimestamp: Date | undefined;

    // Handle direct payload from Call Monitor app
    if (payload.phoneNumber && payload.recordingUrl) {
      console.log('[Recording Sync Webhook] Direct format detected');
      phoneNumber = payload.phoneNumber;
      recordingUrl = payload.recordingUrl;
      duration = payload.duration;
      callTimestamp = payload.timestamp ? new Date(payload.timestamp) : undefined;
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
      
      // Try to extract phone from metadata first
      phoneNumber = metadata?.phoneNumber;
      
      if (!phoneNumber) {
        console.log('[Recording Sync Webhook] ⚠️ No phone number in metadata');
        console.log('[Recording Sync Webhook] ℹ️ Filename format: TIMESTAMP_TIMESTAMP_Call recording NAME...');
        console.log('[Recording Sync Webhook] ℹ️ Attempting to extract contact name from filename');
        
        // Filename format: "1770789394301_1770789394111_Call recording Adthi E2W_260211_112454.m4a"
        // Extract name after "Call recording" and before date/extension
        // Name might be: "Adthi E2W", "Adthi", etc.
        const nameMatch = fName.match(/Call recording\s+([A-Za-z\s]+)/i);
        
        if (!nameMatch) {
          console.log('[Recording Sync Webhook] ❌ Could not extract name from filename:', fName);
          return NextResponse.json({ 
            success: false, 
            message: 'Phone number required. Send payload with phoneNumber field or include in metadata.',
            recordingUrl,
            fileName: fName,
            hint: 'Use format: { phoneNumber: "9360515518", recordingUrl: "..." }'
          });
        }
        
        let contactName = nameMatch[1].trim();
        console.log('[Recording Sync Webhook] 👤 Extracted contact name:', contactName);
        
        // Clean up name - remove "E2W" suffix if present
        contactName = contactName.replace(/\s*E2W\s*$/i, '').trim();
        console.log('[Recording Sync Webhook] 👤 Cleaned contact name:', contactName);
        
        // Try to find lead by name (partial match)
        const leadByName = await prisma.lead.findFirst({
          where: {
            name: { contains: contactName, mode: 'insensitive' }
          },
          select: {
            id: true,
            name: true,
            phone: true,
            assignedToId: true,
          }
        });
        
        if (!leadByName) {
          console.log('[Recording Sync Webhook] ❌ No lead found with name containing:', contactName);
          return NextResponse.json({ 
            success: false, 
            message: 'No lead found matching contact name',
            contactName,
            recordingUrl,
            fileName: fName,
            hint: 'Send phoneNumber in payload for accurate matching'
          });
        }
        
        console.log('[Recording Sync Webhook] ✅ Found lead by name:', leadByName.name);
        phoneNumber = leadByName.phone;
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

    // Determine time window for matching call logs
    let timeWindowStart: Date;
    let timeWindowEnd: Date;
    
    if (callTimestamp) {
      // If we have the actual call timestamp, use a narrow ±2 minute window for precise matching
      const twoMinutes = 2 * 60 * 1000;
      timeWindowStart = new Date(callTimestamp.getTime() - twoMinutes);
      timeWindowEnd = new Date(callTimestamp.getTime() + twoMinutes);
      console.log('[Recording Sync Webhook] 🎯 Using precise timestamp matching (±2 min)');
      console.log(`  Call timestamp: ${callTimestamp.toISOString()}`);
      console.log(`  Search window: ${timeWindowStart.toISOString()} to ${timeWindowEnd.toISOString()}`);
    } else {
      // No timestamp provided, use wider 30-minute window (legacy behavior)
      const thirtyMinutes = 30 * 60 * 1000;
      timeWindowStart = new Date(Date.now() - thirtyMinutes);
      timeWindowEnd = new Date();
      console.log('[Recording Sync Webhook] ⏰ Using 30-minute window (no timestamp in payload)');
    }
    
    // Build query conditions
    const queryConditions: any = {
      leadId: lead.id,
      startedAt: {
        gte: timeWindowStart,
        lte: timeWindowEnd,
      },
      OR: [
        { recordingUrl: null },
        { recordingStatus: 'pending' }
      ]
    };
    
    // If duration is provided, add it as an additional filter for better matching
    if (duration) {
      // Allow ±3 seconds tolerance for duration matching
      queryConditions.duration = {
        gte: duration - 3,
        lte: duration + 3,
      };
      console.log(`[Recording Sync Webhook] 🎯 Also matching by duration: ${duration}s (±3s tolerance)`);
    }
    
    let callLog = await prisma.callLog.findFirst({
      where: queryConditions,
      orderBy: {
        startedAt: 'desc'
      }
    });

    if (callLog) {
      // Update existing call log with recording
      console.log('[Recording Sync Webhook] ✅ Found matching call log!');
      console.log(`  Call Log ID: ${callLog.id}`);
      console.log(`  Call started: ${callLog.startedAt.toISOString()}`);
      console.log(`  Call duration: ${callLog.duration}s`);
      console.log(`  Time diff from recording: ${callTimestamp ? Math.abs(callLog.startedAt.getTime() - callTimestamp.getTime()) / 1000 : 'N/A'}s`);
      
      await prisma.callLog.update({
        where: { id: callLog.id },
        data: {
          recordingUrl,
          recordingStatus: 'available',
          duration: duration || callLog.duration,
        }
      });

      console.log('[Recording Sync Webhook] ✅ Call log updated with recording!');
      
      return NextResponse.json({
        success: true,
        matched: true,
        updated: true,
        message: 'Recording linked to existing call log',
        callLogId: callLog.id,
        leadId: lead.id,
        leadName: lead.name,
        recordingUrl
      });
    }

    // No recent call log found - create a new one
    console.log('[Recording Sync Webhook] ⚠️ No matching call log found - creating new one');
    if (callTimestamp) {
      console.log(`  Expected call around: ${callTimestamp.toISOString()}`);
      console.log(`  This usually means the call wasn't logged in LMS before the recording arrived`);
    }
    
    const newCallLog = await prisma.callLog.create({
      data: {
        id: randomUUID(),
        leadId: lead.id,
        callerId: lead.assignedToId || 'system',
        startedAt: callTimestamp || new Date(),
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
