const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDashboardAPI() {
  try {
    const now = new Date();
    console.log('🔍 Testing Dashboard API Logic\n');
    console.log('Current Time:', now.toISOString());
    console.log('=' .repeat(80));

    // Simulate the exact API logic
    const upcomingFollowUps = await prisma.followUp.findMany({
      where: {
        lead: {
          status: {
            in: ['new', 'followup', 'qualified']
          }
        }
      },
      include: {
        lead: { 
          select: { 
            id: true, 
            name: true, 
            phone: true, 
            status: true 
          } 
        },
        createdBy: { 
          select: { 
            id: true, 
            name: true, 
            email: true 
          } 
        }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    console.log(`\nTotal follow-ups from DB: ${upcomingFollowUps.length}\n`);

    // Apply the FIXED dashboard logic
    // CRITICAL: Find the NEXT follow-up per lead (prefer future over past)
    const leadNextFollowUpForDisplay = new Map();
    
    // Group all follow-ups by leadId
    const followUpsByLeadForDisplay = new Map();
    for (const followUp of upcomingFollowUps) {
      if (!followUpsByLeadForDisplay.has(followUp.leadId)) {
        followUpsByLeadForDisplay.set(followUp.leadId, []);
      }
      followUpsByLeadForDisplay.get(followUp.leadId).push(followUp);
    }
    
    console.log(`Leads with follow-ups: ${followUpsByLeadForDisplay.size}\n`);
    
    // Find the NEXT follow-up per lead (prefer earliest future, else most recent past)
    for (const [leadId, followUps] of followUpsByLeadForDisplay.entries()) {
      const futureFollowUps = followUps.filter(f => new Date(f.scheduledAt) >= now);
      const pastFollowUps = followUps.filter(f => new Date(f.scheduledAt) < now);
      
      let nextFollowUp;
      
      if (futureFollowUps.length > 0) {
        // Prefer earliest future follow-up
        nextFollowUp = futureFollowUps.reduce((earliest, current) => {
          return new Date(current.scheduledAt) < new Date(earliest.scheduledAt) ? current : earliest;
        });
      } else if (pastFollowUps.length > 0) {
        // If no future, use most recent past
        nextFollowUp = pastFollowUps.reduce((latest, current) => {
          return new Date(current.scheduledAt) > new Date(latest.scheduledAt) ? current : latest;
        });
      }
      
      if (nextFollowUp) {
        leadNextFollowUpForDisplay.set(leadId, nextFollowUp);
        console.log(`  ${nextFollowUp.lead.name}: ${new Date(nextFollowUp.scheduledAt).toLocaleString()} - ${new Date(nextFollowUp.scheduledAt) >= now ? 'FUTURE ✅' : 'PAST ❌'}`);
      }
    }
    
    // Filter only FUTURE follow-ups for display
    const upcomingArray = [];
    for (const followUp of leadNextFollowUpForDisplay.values()) {
      const scheduledDate = new Date(followUp.scheduledAt);
      if (scheduledDate >= now) {
        upcomingArray.push(followUp);
      }
    }
    
    // Sort by scheduled date and take top 5
    upcomingArray.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    const displayFollowUps = upcomingArray.slice(0, 5);

    console.log('\n' + '=' .repeat(80));
    console.log(`\n📊 RESULTS:`);
    console.log(`   Upcoming Array: ${upcomingArray.length}`);
    console.log(`   Display Follow-ups: ${displayFollowUps.length}`);
    console.log('\n' + '=' .repeat(80));

    if (displayFollowUps.length > 0) {
      console.log('\n✅ DISPLAY FOLLOW-UPS (What dashboard should show):\n');
      displayFollowUps.forEach((followUp, index) => {
        console.log(`${index + 1}. ${followUp.lead.name}`);
        console.log(`   Scheduled: ${new Date(followUp.scheduledAt).toLocaleString()}`);
        console.log(`   Notes: ${followUp.notes || followUp.customerRequirement || '-'}`);
        console.log('');
      });
    } else {
      console.log('\n❌ NO UPCOMING FOLLOW-UPS TO DISPLAY!');
      console.log('\nThis means dashboard will show: "No upcoming follow-ups available"\n');
    }

    // Return in API format
    const result = {
      success: true,
      data: {
        upcomingFollowUps: displayFollowUps.map(f => ({
          id: f.id,
          leadId: f.leadId,
          scheduledAt: f.scheduledAt,
          notes: f.notes,
          customerRequirement: f.customerRequirement,
          lead: f.lead
        }))
      }
    };

    console.log('\n📦 API Response Format:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDashboardAPI();
