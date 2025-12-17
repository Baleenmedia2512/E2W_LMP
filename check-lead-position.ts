import prisma from './src/shared/lib/db/prisma';

async function checkLeadsQuery() {
  const phoneNumbers = ['+917695882142', '+919819598806', '9788969924'];
  
  // Count total leads
  const totalLeads = await prisma.lead.count();
  console.log('Total leads in database:', totalLeads);
  
  // Check the position of target leads when ordered by createdAt DESC
  for (const phone of phoneNumbers) {
    const cleanPhone = phone.replace('+', '').replace(/[^0-9]/g, '');
    
    const lead = await prisma.lead.findFirst({
      where: {
        phone: { contains: cleanPhone }
      },
      select: {
        id: true,
        name: true,
        phone: true,
        createdAt: true,
        status: true,
      }
    });
    
    if (lead) {
      // Count how many leads were created AFTER this lead
      const newerLeads = await prisma.lead.count({
        where: {
          createdAt: { gt: lead.createdAt }
        }
      });
      
      console.log(`\nLead: ${lead.name} (${phone})`);
      console.log('  Created:', lead.createdAt);
      console.log('  Status:', lead.status);
      console.log('  Position in DESC order:', newerLeads + 1);
      console.log('  Within LIMIT 100?', newerLeads < 100 ? 'YES ✓' : 'NO ✗');
    } else {
      console.log(`\nLead with phone ${phone} not found`);
    }
  }
  
  // Check if filtering by status would help
  console.log('\n=== Active Leads Count ===');
  const activeStatuses = ['new', 'followup', 'qualified'];
  const activeLeadsCount = await prisma.lead.count({
    where: {
      status: { in: activeStatuses }
    }
  });
  console.log('Active leads (new, followup, qualified):', activeLeadsCount);

  await prisma.$disconnect();
}

checkLeadsQuery().catch(console.error);
