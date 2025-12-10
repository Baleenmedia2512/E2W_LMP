import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateLeadDates() {
  try {
    console.log('Starting to update lead dates...');

    // Update leads with names "yasheer test" and "dummy"
    const result = await prisma.lead.updateMany({
      where: {
        OR: [
          { name: { contains: 'yasheer test', mode: 'insensitive' } },
          { name: { contains: 'dummy', mode: 'insensitive' } },
        ],
        phone: {
          in: ['7878787876', '8281018138'],
        },
      },
      data: {
        updatedAt: new Date(), // Set to current date/time
      },
    });

    console.log(`✅ Successfully updated ${result.count} lead(s)`);
    console.log(`Updated date: ${new Date().toLocaleString()}`);

    // Display the updated leads
    const updatedLeads = await prisma.lead.findMany({
      where: {
        OR: [
          { name: { contains: 'yasheer test', mode: 'insensitive' } },
          { name: { contains: 'dummy', mode: 'insensitive' } },
        ],
        phone: {
          in: ['7878787876', '8281018138'],
        },
      },
      select: {
        name: true,
        phone: true,
        status: true,
        updatedAt: true,
      },
    });

    console.log('\nUpdated leads:');
    updatedLeads.forEach(lead => {
      console.log(`- ${lead.name} (${lead.phone}): Updated at ${lead.updatedAt.toLocaleString()}`);
    });

  } catch (error) {
    console.error('❌ Error updating leads:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateLeadDates()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
