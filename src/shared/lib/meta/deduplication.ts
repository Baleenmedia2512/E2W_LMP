import prisma from '@/shared/lib/db/prisma';
import crypto from 'crypto';

/**
 * Check if a lead already exists in the database
 * @param phone - Phone number
 * @param email - Email address (optional)
 * @param metaLeadId - Meta's unique lead ID
 * @returns Existing lead if found, null otherwise
 */
export async function findDuplicateLead(
  phone: string,
  email: string | null,
  metaLeadId: string
) {
  // First check by Meta Lead ID in metadata
  const allMetaLeads = await prisma.lead.findMany({
    where: {
      source: 'Meta',
    },
  });

  const existingByMetaId = allMetaLeads.find((lead: any) => {
    try {
      const metadata = typeof lead.metadata === 'string' 
        ? JSON.parse(lead.metadata) 
        : lead.metadata;
      return metadata?.metaLeadId === metaLeadId;
    } catch {
      return false;
    }
  });

  if (existingByMetaId) {
    console.log(`✅ Duplicate found by Meta ID: ${metaLeadId}`);
    return existingByMetaId;
  }

  // Then check by phone/email if phone is valid
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
      console.log(`✅ Duplicate found by contact: ${phone}`);
      return existingByContact;
    }
  }

  return null;
}

/**
 * Update existing lead with Meta data if it was created as placeholder
 * @param leadId - Lead ID to update
 * @param data - Updated lead data
 */
export async function updateLeadWithMetaData(
  leadId: string,
  data: {
    name?: string;
    phone?: string;
    email?: string | null;
    campaign?: string | null;
    customerRequirement?: string | null;
    metadata?: Record<string, any>;
  }
) {
  try {
    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    // Log activity
    await prisma.activityHistory.create({
      data: {
        id: crypto.randomUUID(),
        leadId: leadId,
        userId: 'system',
        action: 'updated',
        description: 'Lead data updated from Meta API',
      },
    });

    console.log(`✅ Lead updated: ${leadId}`);
    return updated;
  } catch (error) {
    console.error(`❌ Error updating lead ${leadId}:`, error);
    throw error;
  }
}
