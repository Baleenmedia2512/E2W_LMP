# Quick script to check recent leads from database
# Run this from your project directory

Write-Host "Checking recent leads in database..." -ForegroundColor Cyan

# Create a simple Node.js script to query database
$checkScript = @'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLeads() {
  try {
    const leads = await prisma.lead.findMany({
      where: { source: 'Meta' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
        metadata: true
      }
    });

    console.log('\nRecent Meta Leads:');
    console.log('==========================================');
    if (leads.length === 0) {
      console.log('No Meta leads found in database');
    } else {
      leads.forEach((lead, index) => {
        console.log('\n' + (index + 1) + '. Lead ID: ' + lead.id);
        console.log('   Name: ' + lead.name);
        console.log('   Phone: ' + lead.phone);
        console.log('   Email: ' + (lead.email || 'N/A'));
        console.log('   Created: ' + lead.createdAt);
        if (lead.metadata) {
          console.log('   Meta Lead ID: ' + (lead.metadata.metaLeadId || 'N/A'));
        }
      });
    }
    console.log('\n==========================================\n');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkLeads();
'@

# Save the script
$checkScript | Out-File -FilePath "check-leads.js" -Encoding UTF8

# Run it
Write-Host "`nRunning database check...`n" -ForegroundColor Yellow
node check-leads.js

# Clean up
Remove-Item "check-leads.js" -ErrorAction SilentlyContinue

Write-Host "`nDone!`n" -ForegroundColor Green
