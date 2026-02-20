import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Leads to reschedule - phone numbers and their current follow-up dates
// The script will move each follow-up to the same day next month
const leadsToReschedule = [
  // Overdue by 2 days (14-Feb-26) → 14-Mar-26
  { phone: '9500058076', name: 'EGYTIM ACADEMY PVT LTD' },
  { phone: '9158444110', name: 'Mediaide Surgicals' },
  { phone: '9514108157', name: 'R.P.SEETHAPATHY' },
  { phone: '9940332803', name: 'Mrs.Latha' },
  { phone: '9344476511', name: 'First Edge Estate' },
  { phone: '9840028543', name: 'Maha Home Care' },
  { phone: '9843006437', name: 'Satish Patel' },
  { phone: '9176998889', name: 'raj' },
  { phone: '8438031330', name: 'Mohamed' },
  { phone: '8939228810', name: 'Ganapathi Prakash KG' },
  
  // Overdue by 1 day (15-Feb-26) → 15-Mar-26
  { phone: '7339094291', name: 'TOLU TECHNOLOGIES PRIVATE LIMITED' },
  { phone: '8939592308', name: 'Krishnan' },
  { phone: '9710397104', name: 'JKB Housing Private Limited' },
  { phone: '9940223994', name: 'Kaaspro Enterprises' },
  { phone: '9841287561', name: 'Legato Packers and Movers Pvt Ltd' },
  { phone: '9618119111', name: 'Study International Group' },
  { phone: '6381612278', name: 'M. Ravindran' },
  { phone: '9941014319', name: 'Kanan International' },
  { phone: '9840233229', name: 'Hafa Foods & Frozen Foods' },
  { phone: '8825783324', name: 'Raja Ganesh' },
  { phone: '9600006150', name: 'Wizzguy Credit Management Services' },
  { phone: '9840146866', name: 'Ajit Tools' },
  { phone: '9941811150', name: 'Dhanalakshmi Autozone India Private Limited' },
  { phone: '9884013222', name: 'Innovative evolution' },
  { phone: '9841776470', name: 'NADC' },
  { phone: '9849725670', name: 'John Srinivas' },
  { phone: '9944082444', name: 'Hemas Kitchen' },
  { phone: '9600376470', name: 'RADHIKA' },
];

async function rescheduleFollowupsToNextMonth() {
  console.log('🔄 Starting follow-up reschedule to next month...\n');
  console.log(`📋 Total leads to process: ${leadsToReschedule.length}\n`);

  let successCount = 0;
  let failCount = 0;
  let notFoundCount = 0;
  let noFollowupCount = 0;

  for (const leadInfo of leadsToReschedule) {
    try {
      // Find lead by phone number
      const lead = await prisma.lead.findFirst({
        where: {
          phone: {
            contains: leadInfo.phone.replace(/^\+?91/, ''),
          },
        },
        include: {
          FollowUp: {
            where: {
              status: { in: ['pending', 'overdue'] },
            },
            orderBy: {
              scheduledAt: 'asc',
            },
            take: 1,
          },
        },
      });

      if (!lead) {
        console.log(`❌ Lead not found: ${leadInfo.name} (${leadInfo.phone})`);
        notFoundCount++;
        continue;
      }

      if (lead.FollowUp.length === 0) {
        console.log(`⚠️  No pending follow-up found: ${leadInfo.name} (${leadInfo.phone})`);
        noFollowupCount++;
        continue;
      }

      const currentFollowUp = lead.FollowUp[0];
      const currentDate = new Date(currentFollowUp.scheduledAt);
      
      // Add one month to the current follow-up date
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + 1);

      // Update the follow-up with new date
      await prisma.followUp.update({
        where: { id: currentFollowUp.id },
        data: { 
          scheduledAt: newDate,
          status: 'pending',
          notes: `Follow-up rescheduled to next month (from ${currentDate.toLocaleDateString('en-IN')} to ${newDate.toLocaleDateString('en-IN')})`,
        },
      });

      // Also update the lead's updatedAt
      await prisma.lead.update({
        where: { id: lead.id },
        data: { updatedAt: new Date() },
      });

      console.log(`✅ ${leadInfo.name}`);
      console.log(`   Phone: ${leadInfo.phone}`);
      console.log(`   Old date: ${currentDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}`);
      console.log(`   New date: ${newDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}`);
      console.log('');

      successCount++;
    } catch (error) {
      console.log(`❌ Error updating ${leadInfo.name}: ${error instanceof Error ? error.message : String(error)}`);
      failCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  ✅ Successfully rescheduled: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  🔍 Lead not found: ${notFoundCount}`);
  console.log(`  ⚠️  No pending follow-up: ${noFollowupCount}`);
  console.log(`  📋 Total processed: ${leadsToReschedule.length}`);

  await prisma.$disconnect();
}

rescheduleFollowupsToNextMonth().catch(console.error);
