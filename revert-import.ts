import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function revertChanges() {
  try {
    console.log('🔄 Reading updated Excel file to get IDs...');

    const filePath = path.join(process.cwd(), '20260122_Lead-Manager-overdue-leads-date-udpated.xlsx');

    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      await prisma.$disconnect();
      return;
    }

    // Read Excel file to get the IDs of changed records
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const leadIds = data.map((row: any) => (row['ID'] || row['id']).trim()).filter((id: string) => id);

    console.log(`📋 Found ${leadIds.length} lead IDs to revert...`);

    if (leadIds.length === 0) {
      console.log('No leads found.');
      await prisma.$disconnect();
      return;
    }

    // Get the most recent export file to reference original scheduled dates
    const exportFiles = fs.readdirSync(process.cwd())
      .filter(f => f.match(/overdue-leads-active-\d+\.xlsx$/))
      .sort()
      .reverse();

    let originalScheduledDates = new Map<string, Date>();

    if (exportFiles.length > 0) {
      console.log(`📖 Reading original export file: ${exportFiles[0]}`);
      
      const originalWorkbook = XLSX.readFile(path.join(process.cwd(), exportFiles[0]));
      const originalWorksheet = originalWorkbook.Sheets[originalWorkbook.SheetNames[0]];
      const originalData = XLSX.utils.sheet_to_json(originalWorksheet);

      originalData.forEach((row: any) => {
        const id = (row['ID'] || row['id'])?.trim();
        const scheduledDate = row['Scheduled Date'] || row['scheduledAt'];
        if (id && scheduledDate) {
          if (typeof scheduledDate === 'number') {
            originalScheduledDates.set(id, new Date((scheduledDate - 25569) * 86400 * 1000));
          } else if (scheduledDate instanceof Date) {
            originalScheduledDates.set(id, scheduledDate);
          } else if (typeof scheduledDate === 'string') {
            originalScheduledDates.set(id, new Date(scheduledDate));
          }
        }
      });
    }

    console.log(`\n🔄 Reverting ${leadIds.length} leads...`);

    let successCount = 0;
    let failCount = 0;

    for (const leadId of leadIds) {
      try {
        // Get current lead status
        const currentLead = await prisma.lead.findUnique({
          where: { id: leadId },
          select: { id: true, name: true, status: true, updatedAt: true },
        });

        if (!currentLead) {
          console.log(`⚠️  Lead not found: ${leadId}`);
          failCount++;
          continue;
        }

        // Prepare revert data
        const revertData: any = {};

        // If marked as unqualified, revert to 'followup'
        if (currentLead.status === 'unqualified') {
          revertData.status = 'followup';
          console.log(`✅ Reverted ${currentLead.name}: Status unqualified → followup`);
        }

        // If we have original scheduled date, use it as updatedAt
        if (originalScheduledDates.has(leadId)) {
          const originalDate = originalScheduledDates.get(leadId);
          revertData.updatedAt = originalDate;
          console.log(`✅ Reverted ${currentLead.name}: updatedAt → ${originalDate?.toISOString()}`);
        }

        // Only update if there are changes
        if (Object.keys(revertData).length > 0) {
          await prisma.lead.update({
            where: { id: leadId },
            data: revertData,
          });
          successCount++;
        }
      } catch (error) {
        console.log(`❌ Failed to revert ${leadId}: ${error instanceof Error ? error.message : String(error)}`);
        failCount++;
      }
    }

    console.log('\n📊 Revert Summary:');
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  ❌ Failed: ${failCount}`);
    console.log(`  ⏭️  Total: ${leadIds.length}`);

  } catch (error) {
    console.error('❌ Error reverting changes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

revertChanges();
