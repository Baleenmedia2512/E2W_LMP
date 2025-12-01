import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';

export const dynamic = 'force-dynamic';

/**
 * Manual Meta Leads Sync - No Auth Required (for testing)
 * Call this endpoint anytime to fetch leads from Meta
 * GET /api/meta/manual-sync
 */

// Round-robin assignment
async function getNextAgent(): Promise<string | null> {
  const agents = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { name: { in: ['Agent', 'SuperAgent'] } },
    },
    select: { id: true },
  });

  if (agents.length === 0) return null;

  const lastLead = await prisma.lead.findFirst({
    where: { assignedToId: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { assignedToId: true },
  });

  if (!lastLead?.assignedToId) return agents[0]?.id || null;

  const currentIndex = agents.findIndex(a => a.id === lastLead.assignedToId);
  const nextIndex = currentIndex === -1 || currentIndex === agents.length - 1 ? 0 : currentIndex + 1;
  return agents[nextIndex]?.id || null;
}

// Parse Meta lead fields
function parseMetaFields(fieldData: any[]): {
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
      result.customFields[field.name] = fieldValue;
    }
  }

  return result;
}

// Check for duplicate
async function isDuplicate(phone: string, email: string | null, metaLeadId: string): Promise<boolean> {
  // Check by phone or email first
  const existing = await prisma.lead.findFirst({
    where: {
      OR: [
        { phone },
        ...(email ? [{ email }] : []),
      ],
    },
  });
  
  return !!existing;
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = process.env.META_ACCESS_TOKEN;
    const pageId = process.env.META_PAGE_ID;

    if (!accessToken || !pageId) {
      return NextResponse.json(
        { 
          error: 'Meta credentials not configured', 
          details: 'META_ACCESS_TOKEN or META_PAGE_ID missing in environment variables' 
        },
        { status: 500 }
      );
    }

    console.log('🚀 Starting manual Meta sync...');
    console.log('📍 Page ID:', pageId);

    // Fetch all lead forms for this page
    const formsUrl = `https://graph.facebook.com/v21.0/${pageId}/leadgen_forms?fields=id,name,status&access_token=${accessToken}`;
    console.log('📋 Fetching forms...');

    const formsResponse = await fetch(formsUrl);
    if (!formsResponse.ok) {
      const errorText = await formsResponse.text();
      console.error('❌ Forms fetch failed:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch forms from Meta', details: errorText },
        { status: 500 }
      );
    }

    const formsData = await formsResponse.json();
    console.log('✅ Forms fetched:', formsData.data?.length || 0);

    if (!formsData.data || formsData.data.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No lead forms found for this page',
        formsCount: 0,
        leadsProcessed: 0,
      });
    }

    let totalLeads = 0;
    let newLeads = 0;
    let duplicates = 0;
    let errors = 0;

    // Fetch leads from last 24 hours for each form
    const since = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);

    for (const form of formsData.data) {
      console.log(`\n📝 Processing form: ${form.name} (${form.id})`);

      // Fetch leads for this form
      const leadsUrl = `https://graph.facebook.com/v21.0/${form.id}/leads?fields=id,created_time,field_data&since=${since}&access_token=${accessToken}`;
      
      const leadsResponse = await fetch(leadsUrl);
      if (!leadsResponse.ok) {
        console.error(`❌ Failed to fetch leads for form ${form.id}`);
        errors++;
        continue;
      }

      const leadsData = await leadsResponse.json();
      const leads = leadsData.data || [];
      
      console.log(`   Found ${leads.length} leads`);
      totalLeads += leads.length;

      // Process each lead
      for (const metaLead of leads) {
        try {
          const { id: metaLeadId, field_data, created_time } = metaLead;

          if (!field_data || field_data.length === 0) {
            console.log(`   ⚠️ No field data for lead ${metaLeadId}`);
            continue;
          }

          // Parse fields
          const parsed = parseMetaFields(field_data);

          if (!parsed.phone) {
            console.log(`   ⚠️ No phone number for lead ${metaLeadId}`);
            continue;
          }

          // Check for duplicate
          const duplicate = await isDuplicate(parsed.phone, parsed.email, metaLeadId);
          if (duplicate) {
            console.log(`   ⚠️ Duplicate: ${parsed.name} (${parsed.phone})`);
            duplicates++;
            continue;
          }

          // Create new lead
          const lead = await prisma.lead.create({
            data: {
              name: parsed.name || `Meta Lead ${metaLeadId.substring(0, 8)}`,
              phone: parsed.phone,
              email: parsed.email,
              source: 'Meta',
              status: 'new',
              priority: 'medium',
              customerRequirement: parsed.customFields.message || null,
              notes: `Lead from Meta form: ${form.name}`,
              metadata: {
                metaLeadId,
                formId: form.id,
                formName: form.name,
                ...parsed.customFields,
                submittedAt: created_time,
                syncedAt: new Date().toISOString(),
              } as any,
              assignedToId: await getNextAgent(),
            },
          });

          // Log activity
          await prisma.activityHistory.create({
            data: {
              leadId: lead.id,
              userId: 'system',
              action: 'created',
              description: `Lead imported from Meta form: ${form.name}`,
            },
          });

          newLeads++;
          console.log(`   ✅ Created: ${lead.name} (${lead.phone})`);
        } catch (error) {
          console.error(`   ❌ Error processing lead:`, error);
          errors++;
        }
      }
    }

    const result = {
      success: true,
      message: 'Manual sync completed',
      summary: {
        formsChecked: formsData.data.length,
        totalLeadsFound: totalLeads,
        newLeadsCreated: newLeads,
        duplicatesSkipped: duplicates,
        errors,
      },
      timestamp: new Date().toISOString(),
    };

    console.log('\n✅ Sync complete:', result.summary);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('❌ Manual sync error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Sync failed', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
