import prisma from './src/shared/lib/db/prisma';
import { categorizeAndSortLeads } from './src/shared/lib/utils/lead-categorization';

async function testFixedQuery() {
  console.log('Testing with increased limit (500)...\n');
  
  const phoneNumbers = ['+917695882142', '+919819598806', '9788969924'];
  
  // Fetch with the new limit (500) like the fixed frontend
  const allLeads = await prisma.lead.findMany({
    include: {
      User_Lead_assignedToIdToUser: { select: { id: true, name: true, email: true } },
      User_Lead_createdByIdToUser: { select: { id: true, name: true, email: true } },
    },
    take: 500,
    orderBy: { createdAt: 'desc' },
  });

  const allFollowUps = await prisma.followUp.findMany({
    include: {
      Lead: { select: { id: true, name: true, phone: true, status: true } },
      User: { select: { id: true, name: true, email: true } },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 500,
  });

  console.log('Total leads fetched:', allLeads.length);
  console.log('Total followups fetched:', allFollowUps.length);

  // Find the 3 target leads
  const targetLeads = allLeads.filter(lead => 
    phoneNumbers.some(phone => lead.phone.includes(phone.replace('+', '').replace(/[^0-9]/g, '')))
  );

  console.log('\n=== TARGET LEADS IN FETCH ===');
  targetLeads.forEach(lead => {
    console.log(`✓ ${lead.name} (${lead.phone}) - Created: ${lead.createdAt}`);
  });

  if (targetLeads.length !== phoneNumbers.length) {
    console.log(`\n⚠️ Only found ${targetLeads.length} of ${phoneNumbers.length} leads!`);
  }

  // Transform and categorize
  const transformedLeads = allLeads.map(lead => ({
    ...lead,
    assignedTo: lead.User_Lead_assignedToIdToUser,
    createdBy: lead.User_Lead_createdByIdToUser,
  })) as any;

  const categorized = categorizeAndSortLeads(transformedLeads, allFollowUps as any);

  console.log('\n=== CATEGORIZATION RESULTS ===');
  console.log('Overdue:', categorized.overdue.length);
  console.log('New:', categorized.newLeads.length);
  console.log('Future:', categorized.future.length);

  // Check if all target leads appear
  console.log('\n=== TARGET LEADS IN CATEGORIES ===');
  phoneNumbers.forEach(phone => {
    const cleanPhone = phone.replace('+', '').replace(/[^0-9]/g, '');
    
    const inOverdue = categorized.overdue.find(c => c.lead.phone.includes(cleanPhone));
    const inNew = categorized.newLeads.find(c => c.lead.phone.includes(cleanPhone));
    const inFuture = categorized.future.find(c => c.lead.phone.includes(cleanPhone));
    
    const found = inOverdue || inNew || inFuture;
    const category = inOverdue ? 'Overdue' : inNew ? 'New' : inFuture ? 'Future' : 'NOT FOUND';
    const status = found ? '✓' : '✗';
    
    console.log(`${status} ${phone} - ${category}`);
    if (found && (inOverdue || inFuture)) {
      const followUp = (inOverdue || inFuture)?.followUp;
      if (followUp) {
        console.log(`   Scheduled: ${followUp.scheduledAt}`);
      }
    }
  });

  await prisma.$disconnect();
}

testFixedQuery().catch(console.error);
