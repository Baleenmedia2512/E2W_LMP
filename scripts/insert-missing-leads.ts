import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface MissingLead {
  campaignId: string;
  campaignName: string;
  formId: string;
  formName: string;
  platform: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  status: string;
}

// Parse your missing leads data
const missingLeads: MissingLead[] = [
  {
    campaignId: '120237787569120282',
    campaignName: 'Apartment screen Ad Chennai',
    formId: '1792237118319527',
    formName: 'Auto Ads leads',
    platform: 'fb',
    name: 'Boppana Saibabu',
    phone: '+919440891644',
    email: 'Saibabu.boppana@gmail.com',
    city: 'Khammam',
    status: 'CREATED',
  },
  {
    campaignId: '120237787569120282',
    campaignName: 'Apartment screen Ad Chennai',
    formId: '1792237118319527',
    formName: 'Auto Ads leads',
    platform: 'fb',
    name: 'Mahaboob Baig',
    phone: '+919962575268',
    email: 'mahaboob84@gmail.com',
    city: 'Chennai',
    status: 'CREATED',
  },
  {
    campaignId: '120237787569120282',
    campaignName: 'Apartment screen Ad Chennai',
    formId: '1792237118319527',
    formName: 'Auto Ads leads',
    platform: 'fb',
    name: 'Dharmesh M',
    phone: '+919710599754',
    email: 'mdharmesh529@gmail.com',
    city: 'Chennai',
    status: 'CREATED',
  },
  {
    campaignId: '120237787569120282',
    campaignName: 'Apartment screen Ad Chennai',
    formId: '1792237118319527',
    formName: 'Auto Ads leads',
    platform: 'an',
    name: 'Jayaseeli Ashok',
    phone: '+919363618675',
    email: 'seelijaya140@gmail.com',
    city: 'Chennai',
    status: 'CREATED',
  },
  {
    campaignId: '120237787569120282',
    campaignName: 'Apartment screen Ad Chennai',
    formId: '1792237118319527',
    formName: 'Auto Ads leads',
    platform: 'an',
    name: 'Elumalai A',
    phone: '+919841319009',
    email: 'aelumalaiaelumalai3@gmail.com',
    city: 'Chennai',
    status: 'CREATED',
  },
  {
    campaignId: '120237367018280282',
    campaignName: 'No PARKING CHENNAI',
    formId: '1792237118319527',
    formName: 'Auto Ads leads',
    platform: 'fb',
    name: 'Sha Ganesh',
    phone: '+919003218731',
    email: 'ganeshhachu@gmail.com',
    city: 'Chennai',
    status: 'CREATED',
  },
  {
    campaignId: '120237367018280282',
    campaignName: 'No PARKING CHENNAI',
    formId: '1792237118319527',
    formName: 'Auto Ads leads',
    platform: 'fb',
    name: 'Anand',
    phone: '+919677016716',
    email: 'anand.sanjay84@gmail.com',
    city: 'Chennai',
    status: 'CREATED',
  },
  {
    campaignId: '120237367018280282',
    campaignName: 'No PARKING CHENNAI',
    formId: '1792237118319527',
    formName: 'Auto Ads leads',
    platform: 'fb',
    name: 'Saravanan E',
    phone: '+919894148433',
    email: 'Saravana.vishwa@gmail.com',
    city: 'Chennai',
    status: 'CREATED',
  },
  {
    campaignId: '120237787569120282',
    campaignName: 'Apartment screen Ad Chennai',
    formId: '1792237118319527',
    formName: 'Auto Ads leads',
    platform: 'fb',
    name: 'K. Rathinavelu.',
    phone: '+919790248733',
    email: 'rathinavelu2111942@gmail.com',
    city: 'Manapparai. 621306. India.',
    status: 'CREATED',
  },
  {
    campaignId: '120237367018280282',
    campaignName: 'No PARKING CHENNAI',
    formId: '1792237118319527',
    formName: 'Auto Ads leads',
    platform: 'fb',
    name: 'Satish Patel',
    phone: '+919843006437',
    email: 'ctshpatel@gmail.com',
    city: 'Chennai',
    status: 'CREATED',
  },
  {
    campaignId: '120237787569120282',
    campaignName: 'Apartment screen Ad Chennai',
    formId: '1792237118319527',
    formName: 'Auto Ads leads',
    platform: 'fb',
    name: 'Aamir Ahmed A',
    phone: '+919884965565',
    email: 'aamirahmed9380@gmail.com',
    city: 'Chennai',
    status: 'CREATED',
  },
  {
    campaignId: '120237367018280282',
    campaignName: 'No PARKING CHENNAI',
    formId: '1792237118319527',
    formName: 'Auto Ads leads',
    platform: 'fb',
    name: 'shivakumar',
    phone: '+919791040786',
    email: 'bcvakumar@yahoo.com',
    city: 'Chennai',
    status: 'CREATED',
  },
];

// Get Gomathi's user ID for assignment (same as webhook logic)
async function getGomathiUserId(): Promise<string | null> {
  try {
    const gomathi = await prisma.user.findFirst({
      where: {
        email: {
          contains: 'gomathi',
        },
      },
      select: { id: true },
    });
    return gomathi?.id || null;
  } catch (error) {
    console.error('Error fetching Gomathi user:', error);
    return null;
  }
}

// Check if lead already exists
async function checkDuplicateLead(phone: string, email: string): Promise<boolean> {
  try {
    const existing = await prisma.lead.findFirst({
      where: {
        OR: [
          { phone: phone },
          ...(email ? [{ email: email }] : []),
        ],
      },
    });
    return !!existing;
  } catch (error) {
    console.error('Error checking duplicate:', error);
    return false;
  }
}

async function insertMissingLeads() {
  console.log('🚀 Starting missing leads insertion...\n');

  const assignedToId = await getGomathiUserId();
  console.log(`👤 Assigning leads to Gomathi: ${assignedToId || 'Not found'}\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const leadData of missingLeads) {
    try {
      console.log(`\n📝 Processing: ${leadData.name} (${leadData.phone})`);

      // Check for duplicates
      const isDuplicate = await checkDuplicateLead(leadData.phone, leadData.email);
      if (isDuplicate) {
        console.log(`⚠️  Skipped - Already exists: ${leadData.name}`);
        skipCount++;
        continue;
      }

      // Generate unique meta lead ID for tracking
      const metaLeadId = `manual_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;

      // Create metadata matching webhook structure
      const metadata = {
        metaLeadId: metaLeadId,
        formId: leadData.formId,
        formName: leadData.formName,
        campaignId: leadData.campaignId,
        campaignName: leadData.campaignName,
        platform: leadData.platform === 'fb' ? 'facebook' : 'other',
        city: leadData.city,
        manualInsert: true,
        insertedAt: new Date().toISOString(),
        originalStatus: leadData.status,
      };

      // Create lead
      const lead = await prisma.lead.create({
        data: {
          id: crypto.randomUUID(),
          name: leadData.name,
          phone: leadData.phone,
          email: leadData.email,
          city: leadData.city,
          source: 'meta',
          campaign: leadData.campaignName,
          status: 'new',
          notes: `Missing lead inserted manually - Original campaign: ${leadData.campaignName}`,
          metadata: JSON.stringify(metadata),
          assignedToId: assignedToId,
          updatedAt: new Date(),
        },
      });

      // Log activity
      await prisma.activityHistory.create({
        data: {
          id: crypto.randomUUID(),
          leadId: lead.id,
          userId: assignedToId || 'system',
          action: 'created',
          description: `Missing lead inserted manually. Campaign: ${leadData.campaignName}, Form: ${leadData.formName}`,
        },
      });

      console.log(`✅ Created: ${leadData.name} - Lead ID: ${lead.id}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error creating lead ${leadData.name}:`, error);
      errorCount++;
    }
  }

  console.log('\n========================================');
  console.log('📊 SUMMARY:');
  console.log(`✅ Successfully created: ${successCount}`);
  console.log(`⚠️  Skipped (duplicates): ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📝 Total processed: ${missingLeads.length}`);
  console.log('========================================\n');
}

// Run the script
insertMissingLeads()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
