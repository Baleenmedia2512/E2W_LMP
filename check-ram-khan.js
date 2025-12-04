const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRamKhan() {
  try {
    const now = new Date();
    console.log('Current Time:', now.toISOString());
    console.log('=' .repeat(80));

    const lead = await prisma.lead.findFirst({
      where: {
        name: {
          contains: 'ram khan'
        }
      },
      include: {
        followUps: {
          orderBy: { scheduledAt: 'asc' }
        }
      }
    });

    if (!lead) {
      console.log('Lead not found!');
      return;
    }

    console.log('\n📋 Lead Details:');
    console.log(`Name: ${lead.name}`);
    console.log(`ID: ${lead.id}`);
    console.log(`Status: ${lead.status}`);
    console.log(`Created: ${lead.createdAt}`);
    console.log('=' .repeat(80));

    console.log(`\n📅 All Follow-ups (${lead.followUps.length}):`);
    
    lead.followUps.forEach((followUp, index) => {
      const scheduledDate = new Date(followUp.scheduledAt);
      const isOverdue = scheduledDate < now;
      const diffMs = Math.abs(now - scheduledDate);
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      console.log(`\n${index + 1}. Follow-up ID: ${followUp.id}`);
      console.log(`   Scheduled: ${scheduledDate.toLocaleString()}`);
      console.log(`   Status: ${isOverdue ? '❌ OVERDUE' : '✅ UPCOMING'}`);
      console.log(`   Time diff: ${diffDays}d ${diffHours}h ${isOverdue ? 'ago' : 'from now'}`);
    });

    console.log('\n' + '=' .repeat(80));
    
    // Find NEXT follow-up (earliest one)
    if (lead.followUps.length > 0) {
      const futureFollowUps = lead.followUps.filter(f => new Date(f.scheduledAt) >= now);
      const pastFollowUps = lead.followUps.filter(f => new Date(f.scheduledAt) < now);
      
      console.log(`\n🔍 Categorization:`);
      console.log(`   Future follow-ups: ${futureFollowUps.length}`);
      console.log(`   Past (overdue) follow-ups: ${pastFollowUps.length}`);
      
      let nextFollowUp;
      
      if (futureFollowUps.length > 0) {
        // Prefer earliest future
        nextFollowUp = futureFollowUps[0];
        console.log(`\n✅ NEXT Follow-up: FUTURE`);
      } else if (pastFollowUps.length > 0) {
        // Use most recent overdue
        nextFollowUp = pastFollowUps[pastFollowUps.length - 1];
        console.log(`\n❌ NEXT Follow-up: OVERDUE (no future follow-ups)`);
      }
      
      if (nextFollowUp) {
        const scheduledDate = new Date(nextFollowUp.scheduledAt);
        const isOverdue = scheduledDate < now;
        console.log(`   Date: ${scheduledDate.toLocaleString()}`);
        console.log(`   Is overdue? ${isOverdue ? '❌ YES' : '✅ NO'}`);
        console.log(`\n💡 This lead will be shown in: ${isOverdue ? '🔴 OVERDUE section' : '🟢 FUTURE section'}`);
      }
    }

    console.log('\n' + '=' .repeat(80));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRamKhan();
