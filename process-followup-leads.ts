import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Parse various date formats including Excel serial numbers
function parseFollowupDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  // Check if it's a number (Excel serial date)
  if (typeof dateValue === 'number') {
    // Excel serial date: days since Dec 30, 1899
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
    return date;
  }
  
  if (typeof dateValue !== 'string') return null;
  
  const trimmed = dateValue.trim().toLowerCase();
  
  // Check if it's "unqualified" - return null to handle separately
  if (trimmed === 'unqualified') return null;
  
  // Try parsing DD-MM-YYYY format (e.g., 01-02-2026)
  const ddmmyyyy = dateValue.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Try parsing DD-MMM-YY format (e.g., 01-Feb-26)
  const ddmmmyy = dateValue.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
  if (ddmmmyy) {
    const [, day, monthStr, year] = ddmmmyy;
    const months: { [key: string]: number } = {
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };
    const month = months[monthStr.toLowerCase()];
    if (month !== undefined) {
      const fullYear = 2000 + parseInt(year);
      return new Date(fullYear, month, parseInt(day));
    }
  }
  
  // Try standard Date parsing as fallback
  const parsed = new Date(dateValue);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  return null;
}

async function processFollowupLeads() {
  try {
    console.log('📂 Reading Excel file...');
    
    const filePath = 'C:\\xampp\\htdocs\\E2W_LMP\\leads-DB-READY_final for today_followup.xlsx';
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      console.log('❌ No sheets found in workbook');
      return;
    }
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      console.log('❌ Worksheet not found');
      return;
    }
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`✅ Found ${data.length} rows in Excel file`);
    
    if (data.length === 0) {
      console.log('⚠️  No data to process');
      return;
    }
    
    // Show first row to understand structure
    console.log('\n📋 First row sample:');
    console.log('  followup date:', data[0]['followup date']);
    
    console.log('\n🔄 Processing leads...');
    
    let followupCreated = 0;
    let leadsMarkedFollowup = 0;
    let leadsMarkedUnqualified = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails: string[] = [];
    
    for (const row of data) {
      try {
        const leadId = row['id'] || row['Id'] || row['ID'];
        const followupDateStr = row['followup date'] || row['Followup Date'] || row['followupDate'];
        const assignedToId = row['assignedToId'] || row['createdById'];
        
        if (!leadId) {
          skipped++;
          continue;
        }
        
        // Check if it's unqualified
        if (followupDateStr && typeof followupDateStr === 'string' && 
            followupDateStr.trim().toLowerCase() === 'unqualified') {
          // Mark lead as unqualified
          await prisma.lead.update({
            where: { id: leadId },
            data: { 
              status: 'unqualified',
              updatedAt: new Date()
            }
          });
          leadsMarkedUnqualified++;
          continue;
        }
        
        // Try to parse date
        const scheduledAt = parseFollowupDate(followupDateStr);
        
        if (scheduledAt) {
          // Update lead status to followup
          await prisma.lead.update({
            where: { id: leadId },
            data: { 
              status: 'followup',
              updatedAt: new Date()
            }
          });
          leadsMarkedFollowup++;
          
          // Check if followup already exists for this lead
          const existingFollowup = await prisma.followUp.findFirst({
            where: { 
              leadId: leadId,
              status: 'pending'
            }
          });
          
          if (existingFollowup) {
            // Update existing followup
            await prisma.followUp.update({
              where: { id: existingFollowup.id },
              data: {
                scheduledAt: scheduledAt,
                updatedAt: new Date()
              }
            });
          } else {
            // Create new followup
            await prisma.followUp.create({
              data: {
                id: uuidv4(),
                leadId: leadId,
                scheduledAt: scheduledAt,
                status: 'pending',
                priority: 'medium',
                createdById: assignedToId || 'cmiilnjo8000417yycazxvwkv', // Default user if not found
                notes: `Follow-up scheduled from Excel import`,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
          }
          followupCreated++;
        } else {
          skipped++;
        }
        
        if ((leadsMarkedFollowup + leadsMarkedUnqualified) % 100 === 0 && 
            (leadsMarkedFollowup + leadsMarkedUnqualified) > 0) {
          console.log(`  Processed ${leadsMarkedFollowup + leadsMarkedUnqualified} leads...`);
        }
        
      } catch (error: any) {
        errors++;
        if (errorDetails.length < 10) {
          errorDetails.push(`Error: ${error.message}`);
        }
      }
    }
    
    console.log(`\n✅ Processing completed!`);
    console.log(`  ✓ Leads marked as followup: ${leadsMarkedFollowup}`);
    console.log(`  ✓ Follow-up records created/updated: ${followupCreated}`);
    console.log(`  ✓ Leads marked as unqualified: ${leadsMarkedUnqualified}`);
    console.log(`  ⊘ Skipped (no valid date): ${skipped}`);
    console.log(`  ✗ Errors: ${errors}`);
    
    if (errorDetails.length > 0) {
      console.log('\n📋 Error details:');
      errorDetails.forEach(e => console.log(`  - ${e}`));
    }
    
    // Show final stats
    const totalLeads = await prisma.lead.count();
    const followupLeads = await prisma.lead.count({ where: { status: 'followup' } });
    const unqualifiedLeads = await prisma.lead.count({ where: { status: 'unqualified' } });
    const pendingFollowups = await prisma.followUp.count({ where: { status: 'pending' } });
    
    console.log(`\n📊 Database stats:`);
    console.log(`  Total leads: ${totalLeads}`);
    console.log(`  Followup status leads: ${followupLeads}`);
    console.log(`  Unqualified leads: ${unqualifiedLeads}`);
    console.log(`  Pending follow-ups: ${pendingFollowups}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

processFollowupLeads();
