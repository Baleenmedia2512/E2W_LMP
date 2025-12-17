import prisma from './src/shared/lib/db/prisma';
import { categorizeAndSortLeads } from './src/shared/lib/utils/lead-categorization';

async function diagnoseMissingLeads() {
  console.log('Current time:', new Date().toISOString());
  console.log('Current time (local):', new Date().toString());
  
  const phoneNumbers = ['+917695882142', '+919819598806', '9788969924'];
  
  // Fetch all leads and followups like the frontend does
  const allLeads = await prisma.lead.findMany({
    include: {
      User_Lead_assignedToIdToUser: { select: { id: true, name: true, email: true } },
      User_Lead_createdByIdToUser: { select: { id: true, name: true, email: true } },
    },
    take: 100,
    orderBy: { createdAt: 'desc' },
  });

  const allFollowUps = await prisma.followUp.findMany({
    include: {
      Lead: { select: { id: true, name: true, phone: true, status: true } },
      User: { select: { id: true, name: true, email: true } },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 1000,
  });

  console.log('\nTotal leads fetched:', allLeads.length);
  console.log('Total followups fetched:', allFollowUps.length);

  // Find the 3 specific leads
  const targetLeads = allLeads.filter(lead => 
    phoneNumbers.some(phone => lead.phone.includes(phone.replace('+', '').replace(/[^0-9]/g, '')))
  );

  console.log('\n=== TARGET LEADS FOUND ===');
  targetLeads.forEach(lead => {
    console.log(`\nLead: ${lead.name} (${lead.phone})`);
    console.log('  ID:', lead.id);
    console.log('  Status:', lead.status);
    console.log('  Created:', lead.createdAt);
    
    const leadFollowUps = allFollowUps.filter(f => f.leadId === lead.id);
    console.log('  Followups count:', leadFollowUps.length);
    leadFollowUps.forEach(fu => {
      const scheduledDate = new Date(fu.scheduledAt);
      const now = new Date();
      const isFuture = scheduledDate >= now;
      console.log(`    - ${fu.scheduledAt} (${scheduledDate.toString()}) - ${isFuture ? 'FUTURE' : 'PAST'} - Status: ${fu.status}`);
    });
  });

  // Transform leads like frontend does
  const transformedLeads = allLeads.map(lead => ({
    ...lead,
    assignedTo: lead.User_Lead_assignedToIdToUser,
    createdBy: lead.User_Lead_createdByIdToUser,
  })) as any;

  // Run categorization
  console.log('\n=== RUNNING CATEGORIZATION ===');
  const categorized = categorizeAndSortLeads(transformedLeads, allFollowUps as any);

  console.log('\nCategorization Results:');
  console.log('  Overdue:', categorized.overdue.length);
  console.log('  New:', categorized.newLeads.length);
  console.log('  Future:', categorized.future.length);

  // Check if target leads appear in any category
  console.log('\n=== CHECKING TARGET LEADS IN CATEGORIES ===');
  phoneNumbers.forEach(phone => {
    const cleanPhone = phone.replace('+', '').replace(/[^0-9]/g, '');
    
    const inOverdue = categorized.overdue.find(c => c.lead.phone.includes(cleanPhone));
    const inNew = categorized.newLeads.find(c => c.lead.phone.includes(cleanPhone));
    const inFuture = categorized.future.find(c => c.lead.phone.includes(cleanPhone));
    
    console.log(`\nPhone: ${phone}`);
    console.log('  In Overdue:', !!inOverdue);
    console.log('  In New:', !!inNew);
    console.log('  In Future:', !!inFuture);
    
    if (!inOverdue && !inNew && !inFuture) {
      console.log('  ⚠️  NOT FOUND IN ANY CATEGORY!');
      const targetLead = targetLeads.find(l => l.phone.includes(cleanPhone));
      if (targetLead) {
        console.log('  Lead status:', targetLead.status);
        console.log('  Should be visible:', ['new', 'followup', 'qualified'].includes(targetLead.status));
      }
    } else if (inFuture) {
      console.log('  ✓ Found in Future category');
      console.log('  Scheduled at:', inFuture.followUp?.scheduledAt);
    }
  });

  await prisma.$disconnect();
}

diagnoseMissingLeads().catch(console.error);
