import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

async function updateExistingLeads() {
  try {
    console.log('📂 Reading Excel file...');
    
    const filePath = 'C:\\xampp\\htdocs\\E2W_LMP\\leads-DB-READY_final for today_followup_ccccccccccccc.xlsx';
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
    console.log(JSON.stringify(data[0], null, 2));
    
    // Extract unique names from Excel
    const namesInExcel = new Set<string>();
    
    for (const row of data) {
      const name = row['name'] || row['Name'] || row['NAME'];
      if (name && typeof name === 'string' && name.trim()) {
        namesInExcel.add(name.trim());
      }
    }
    
    console.log(`\n✅ Found ${namesInExcel.size} unique names in Excel file`);
    console.log('\n🔄 Updating leads with is_existing = true...');
    
    let updated = 0;
    let notFound = 0;
    const notFoundNames: string[] = [];
    
    for (const name of Array.from(namesInExcel)) {
      try {
        // Find leads with matching name
        const matchingLeads = await prisma.lead.findMany({
          where: {
            name: {
              equals: name,
              mode: 'insensitive' // Case-insensitive search
            }
          }
        });
        
        if (matchingLeads.length > 0) {
          // Update all matching leads
          const result = await prisma.lead.updateMany({
            where: {
              name: {
                equals: name,
                mode: 'insensitive'
              }
            },
            data: {
              is_existing: true
            }
          });
          
          updated += result.count;
          console.log(`✅ Updated ${result.count} lead(s) for: ${name}`);
        } else {
          notFound++;
          notFoundNames.push(name);
          console.log(`⚠️  Lead not found: ${name}`);
        }
      } catch (error) {
        console.error(`❌ Error updating lead ${name}:`, error);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 UPDATE SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Total leads updated: ${updated}`);
    console.log(`⚠️  Leads not found: ${notFound}`);
    console.log(`📝 Total names in Excel: ${namesInExcel.size}`);
    
    if (notFoundNames.length > 0 && notFoundNames.length <= 20) {
      console.log('\n⚠️  Names not found in database:');
      notFoundNames.forEach(name => console.log(`   - ${name}`));
    } else if (notFoundNames.length > 20) {
      console.log(`\n⚠️  ${notFoundNames.length} names not found in database (too many to display)`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateExistingLeads();
