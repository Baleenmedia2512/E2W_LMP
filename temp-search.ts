import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function searchLeads() {
  const leads = await prisma.lead.findMany({
    where: {
      name: {
        contains: 'crystal',
        mode: 'insensitive'
      }
    },
    select: {
      id: true,
      name: true,
      phone: true,
      status: true
    }
  });
  
  console.log('Found in DB:', leads.length);
  leads.forEach(l => console.log(l));
  
  await prisma.$disconnect();
}

searchLeads();
