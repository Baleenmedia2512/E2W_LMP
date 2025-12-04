const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOverdueLeads() {
  try {
    const now = new Date();
    console.log('Current Time:', now.toISOString());
    console.log('=' .repeat(80));

    // Get all active leads (matching dashboard logic)
    const activeLeads = await prisma.lead.findMany({
      where: {
        status: {
          in: ['new', 'followup', 'qualified']
        }
      },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        createdAt: true
      }
    });

    console.log(`\nTotal Active Leads: ${activeLeads.length}`);
    console.log('=' .repeat(80));

    // Get all follow-ups for active leads
    const allFollowUps = await prisma.followUp.findMany({
      where: {
        lead: {
          status: {
            in: ['new', 'followup', 'qualified']
          }
        }
      },
      select: {
        id: true,
        leadId: true,
        scheduledAt: true,
        createdAt: true,
        lead: {
          select: {
            name: true,
            status: true
          }
        }
      },
      orderBy: {
        scheduledAt: 'asc'
      }
    });

    console.log(`\nTotal Follow-ups for Active Leads: ${allFollowUps.length}`);
    console.log('=' .repeat(80));

    // Group by leadId and find NEXT (earliest) follow-up per lead
    const leadNextFollowUpMap = new Map();
    
    for (const followUp of allFollowUps) {
      const existing = leadNextFollowUpMap.get(followUp.leadId);
      const followUpDate = new Date(followUp.scheduledAt);
      
      if (!existing || followUpDate < new Date(existing.scheduledAt)) {
        leadNextFollowUpMap.set(followUp.leadId, followUp);
      }
    }

    console.log(`\nLeads with Follow-ups: ${leadNextFollowUpMap.size}`);
    console.log('=' .repeat(80));

    // Find overdue leads
    const overdueLeads = [];
    
    for (const [leadId, followUp] of leadNextFollowUpMap.entries()) {
      const scheduledDate = new Date(followUp.scheduledAt);
      if (scheduledDate < now) {
        overdueLeads.push({
          leadId,
          leadName: followUp.lead.name,
          leadStatus: followUp.lead.status,
          scheduledAt: followUp.scheduledAt,
          overdueSince: Math.floor((now - scheduledDate) / (1000 * 60 * 60 * 24)) + ' days'
        });
      }
    }

    console.log(`\n🔴 OVERDUE LEADS: ${overdueLeads.length}`);
    console.log('=' .repeat(80));
    
    if (overdueLeads.length > 0) {
      overdueLeads.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
      
      console.log('\nOverdue Lead Details:');
      overdueLeads.forEach((lead, index) => {
        console.log(`\n${index + 1}. ${lead.leadName}`);
        console.log(`   Lead ID: ${lead.leadId}`);
        console.log(`   Status: ${lead.leadStatus}`);
        console.log(`   Scheduled At: ${new Date(lead.scheduledAt).toLocaleString()}`);
        console.log(`   Overdue By: ${lead.overdueSince}`);
      });
    }

    console.log('\n' + '=' .repeat(80));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOverdueLeads();
