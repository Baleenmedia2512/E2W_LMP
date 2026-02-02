import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function updateLastEditDate() {
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

    // Extract lead IDs
    const leadIds = data
      .map((row: any) => (row['ID'] || row['id'])?.trim())
      .filter((id: string) => id && id.length > 0);

    console.log(`📝 Found ${leadIds.length} leads to update...`);

    if (leadIds.length === 0) {
      console.log('No leads found.');
      await prisma.$disconnect();
      return;
    }

    // Update all leads with today's date
    const today = new Date();
    let successCount = 0;
    let failCount = 0;

    for (const leadId of leadIds) {
      try {
        const updated = await prisma.lead.update({
          where: { id: leadId },
          data: { updatedAt: today },
          select: { id: true, name: true, updatedAt: true },
        });

        console.log(`✅ ${updated.name}: Last Edit → ${updated.updatedAt.toLocaleString()}`);
        successCount++;
      } catch (error) {
        console.log(`❌ Failed to update ${leadId}: ${error instanceof Error ? error.message : String(error)}`);
        failCount++;
      }
    }

    console.log('\n📊 Update Summary:');
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  ❌ Failed: ${failCount}`);
    console.log(`  ⏭️  Total: ${leadIds.length}`);
    console.log(`\n✨ All records now show Last Edit: Today (${today.toLocaleString()})`);

  } catch (error) {
    console.error('❌ Error updating last edit dates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateLastEditDate();
