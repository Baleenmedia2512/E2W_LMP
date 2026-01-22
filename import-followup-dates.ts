import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface LeadUpdate {
  id: string;
  name: string;
  phone: string;
  newDate?: Date;
  status?: string;
}

async function importAndUpdateFollowups() {
  try {
    console.log('📖 Reading Excel file...');

    const filePath = path.join(process.cwd(), '20260122_Lead-Manager-overdue-leads-date-udpated.xlsx');

    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      await prisma.$disconnect();
      return;
    }

    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`✅ Read ${data.length} rows from Excel`);

    if (data.length === 0) {
      console.log('No data to import.');
      await prisma.$disconnect();
      return;
    }

    // Parse the data
    const leadsToUpdate: LeadUpdate[] = [];
    const errors: string[] = [];

    data.forEach((row: any, index: number) => {
      const rowNum = index + 2; // Excel row number (1-indexed + header)

      try {
        const id = row['ID'] || row['id'];
        const name = row['Name'] || row['name'];
        const phone = row['Mobile Number'] || row['phone'];
        
        // Try to find the date column
        let dateValue = row['Scheduled Date'] || 
                       row['Scheduled Follow-up Date'] || 
                       row['scheduledAt'] ||
                       row['updatedAt'] ||
                       row['NewDate'] ||
                       row['New Date'];

        // Check all columns for a date-like value
        if (!dateValue) {
          const dateColumns = Object.keys(row).filter(key => 
            key.toLowerCase().includes('date') && 
            !key.toLowerCase().includes('days overdue')
          );
          if (dateColumns.length > 0) {
            dateValue = row[dateColumns[dateColumns.length - 1]];
          }
        }

        if (!id) {
          errors.push(`Row ${rowNum}: Missing ID`);
          return;
        }

        if (!dateValue) {
          errors.push(`Row ${rowNum}: Missing date value for ${id} (${name})`);
          return;
        }

        // Check if it's marked as UNQUALIFIED
        if (typeof dateValue === 'string' && dateValue.toUpperCase() === 'UNQUALIFIED') {
          leadsToUpdate.push({
            id: id.trim(),
            name: name || 'Unknown',
            phone: phone || 'Unknown',
            status: 'unqualified',
          });
          return;
        }

        // Parse the date
        let parsedDate: Date;
        if (typeof dateValue === 'number') {
          // Excel serial number
          parsedDate = new Date((dateValue - 25569) * 86400 * 1000);
        } else if (dateValue instanceof Date) {
          parsedDate = dateValue;
        } else if (typeof dateValue === 'string') {
          // Handle multiple date formats
          let dateStr = dateValue.trim();
          
          // Format: DD/MM/YYYY, HH:MM:SS AM/PM or DD/MM/YYYY, HH:MM:SS
          const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{2}):?(\d{2})?\s*(am|pm)?/i);
          if (match) {
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10) - 1; // JS months are 0-indexed
            const year = parseInt(match[3], 10);
            let hour = parseInt(match[4], 10);
            const minute = parseInt(match[5], 10);
            const second = match[6] ? parseInt(match[6], 10) : 0;
            const meridiem = match[8]?.toLowerCase();
            
            // Handle AM/PM
            if (meridiem === 'pm' && hour !== 12) {
              hour += 12;
            } else if (meridiem === 'am' && hour === 12) {
              hour = 0;
            }
            
            parsedDate = new Date(year, month, day, hour, minute, second);
          } else {
            // Try standard parsing
            parsedDate = new Date(dateStr);
          }
        } else {
          errors.push(`Row ${rowNum}: Invalid date format for ${id}: ${dateValue}`);
          return;
        }

        if (isNaN(parsedDate.getTime())) {
          errors.push(`Row ${rowNum}: Could not parse date for ${id}: ${dateValue}`);
          return;
        }

        leadsToUpdate.push({
          id: id.trim(),
          name: name || 'Unknown',
          phone: phone || 'Unknown',
          newDate: parsedDate,
        });
      } catch (error) {
        errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    if (errors.length > 0) {
      console.log('\n⚠️  Errors found:');
      errors.forEach(err => console.log(`  - ${err}`));
    }

    console.log(`\n📝 Preparing to update ${leadsToUpdate.length} leads...`);

    if (leadsToUpdate.length === 0) {
      console.log('No valid leads to update.');
      await prisma.$disconnect();
      return;
    }

    // Update leads and their follow-ups in database
    let successCount = 0;
    let failCount = 0;
    const updateErrors: string[] = [];

    for (const lead of leadsToUpdate) {
      try {
        let statusChanged = false;
        let dateChanged = false;

        // Handle UNQUALIFIED status
        if (lead.status === 'unqualified') {
          await prisma.lead.update({
            where: { id: lead.id },
            data: { 
              status: 'unqualified',
              updatedAt: new Date(),
            },
          });
          statusChanged = true;
          console.log(`✅ Updated: ${lead.name} (${lead.phone}) → Status: UNQUALIFIED`);
        } else if (lead.newDate) {
          // Update Lead.updatedAt
          await prisma.lead.update({
            where: { id: lead.id },
            data: { updatedAt: lead.newDate },
          });
          dateChanged = true;

          // Find the lead's next follow-up (pending, prefer overdue/earliest date)
          const followUps = await prisma.followUp.findMany({
            where: {
              leadId: lead.id,
              status: 'pending',
            },
            orderBy: { scheduledAt: 'asc' },
          });

          if (followUps.length > 0) {
            // Update the first/earliest pending follow-up
            const nextFollowUp = followUps[0];
            
            await prisma.followUp.update({
              where: { id: nextFollowUp.id },
              data: { scheduledAt: lead.newDate },
            });

            console.log(`✅ Updated: ${lead.name} (${lead.phone})`);
            console.log(`   - Lead.updatedAt: ${lead.newDate.toISOString()}`);
            console.log(`   - FollowUp.scheduledAt: ${lead.newDate.toISOString()}`);
          } else {
            // No pending follow-up, just update lead date
            console.log(`✅ Updated: ${lead.name} (${lead.phone}) → Lead.updatedAt: ${lead.newDate.toISOString()}`);
            console.log(`   ⚠️  (No pending follow-up found to update)`);
          }
        }

        if (statusChanged || dateChanged) {
          successCount++;
        }
      } catch (error) {
        const errorMsg = `❌ Failed to update ${lead.id} (${lead.name}): ${error instanceof Error ? error.message : String(error)}`;
        console.log(errorMsg);
        updateErrors.push(errorMsg);
        failCount++;
      }
    }

    console.log('\n📊 Update Summary:');
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  ❌ Failed: ${failCount}`);
    console.log(`  ⏭️  Total: ${leadsToUpdate.length}`);

    if (updateErrors.length > 0) {
      console.log('\n🔴 Update Errors:');
      updateErrors.slice(0, 10).forEach(err => console.log(`  ${err}`));
      if (updateErrors.length > 10) {
        console.log(`  ... and ${updateErrors.length - 10} more errors`);
      }
    }

  } catch (error) {
    console.error('❌ Error importing leads:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importAndUpdateFollowups();
