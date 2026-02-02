import prisma from './src/shared/lib/db/prisma';

async function checkLeads() {
  const phoneNumbers = ['+917695882142', '+919819598806', '9788969924'];

  for (const phone of phoneNumbers) {
    console.log(`\n=== Checking Lead: ${phone} ===`);
    
    const lead = await prisma.lead.findFirst({
      where: {
        phone: {
          contains: phone.replace('+', '').replace(/[^0-9]/g, '')
        }
      },
      include: {
        FollowUp: {
          orderBy: { scheduledAt: 'asc' }
        }
      }
    });

    if (lead) {
      console.log('Lead ID:', lead.id);
      console.log('Name:', lead.name);
      console.log('Phone:', lead.phone);
      console.log('Status:', lead.status);
      console.log('Created:', lead.createdAt);
      console.log('AssignedTo:', lead.assignedToId);
      console.log('FollowUps:');
      lead.FollowUp.forEach((f: any) => {
        console.log(`  - ID: ${f.id}, Scheduled: ${f.scheduledAt}, Status: ${f.status}`);
      });
    } else {
      console.log('Lead not found with phone:', phone);
    }
  }

  await prisma.$disconnect();
}

checkLeads().catch(console.error);
