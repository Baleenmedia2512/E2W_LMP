import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function viewFollowupsByDate() {
  try {
    // Define the dates to query
    const dates = [
      { label: 'February 14, 2026', start: new Date('2026-02-14T00:00:00'), end: new Date('2026-02-14T23:59:59.999') },
      { label: 'February 15, 2026', start: new Date('2026-02-15T00:00:00'), end: new Date('2026-02-15T23:59:59.999') },
    ];

    for (const dateRange of dates) {
      console.log('\n' + '='.repeat(80));
      console.log(`📅 Follow-ups scheduled for ${dateRange.label}`);
      console.log('='.repeat(80));

      const followUps = await prisma.followUp.findMany({
        where: {
          scheduledAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
        include: {
          Lead: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              status: true,
              priority: true,
              User_Lead_assignedToIdToUser: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          scheduledAt: 'asc',
        },
      });

      if (followUps.length === 0) {
        console.log('  No follow-ups scheduled for this date.');
      } else {
        console.log(`  Total: ${followUps.length} follow-ups\n`);
        
        followUps.forEach((followUp, index) => {
          console.log(`  ${index + 1}. Lead: ${followUp.Lead.name}`);
          console.log(`     Phone: ${followUp.Lead.phone}`);
          console.log(`     Status: ${followUp.status} | Lead Status: ${followUp.Lead.status}`);
          console.log(`     Priority: ${followUp.Lead.priority || 'N/A'}`);
          console.log(`     Assigned To: ${followUp.Lead.User_Lead_assignedToIdToUser?.name || 'Unassigned'}`);
          console.log(`     Scheduled At: ${followUp.scheduledAt.toLocaleString()}`);
          if (followUp.notes) {
            console.log(`     Notes: ${followUp.notes}`);
          }
          console.log('');
        });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    
    for (const dateRange of dates) {
      const count = await prisma.followUp.count({
        where: {
          scheduledAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
      });
      
      const pendingCount = await prisma.followUp.count({
        where: {
          scheduledAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
          status: 'pending',
        },
      });
      
      const completedCount = await prisma.followUp.count({
        where: {
          scheduledAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
          status: 'completed',
        },
      });
      
      console.log(`\n${dateRange.label}:`);
      console.log(`  Total: ${count} | Pending: ${pendingCount} | Completed: ${completedCount}`);
    }

  } catch (error) {
    console.error('Error fetching follow-ups:', error);
  } finally {
    await prisma.$disconnect();
  }
}

viewFollowupsByDate();
