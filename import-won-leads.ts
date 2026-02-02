import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function importWonLeads() {
  try {
    console.log('📂 Reading Excel file...');
    
    const filePath = 'C:\\xampp\\htdocs\\E2W_LMP\\transformed-leads-gomathi-UPDATED.xlsx';
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`✅ Found ${data.length} rows in Excel file`);
    
    if (data.length === 0) {
      console.log('⚠️  No data to import');
      return;
    }
    
    // Show first row to understand structure
    console.log('\n📋 First row sample:');
    console.log(JSON.stringify(data[0], null, 2));
    
    console.log('\n🔄 Importing leads...');
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const row of data) {
      try {
        // Map Excel columns to database fields
        // Adjust these mappings based on actual Excel column names
        const leadData: any = {
          id: uuidv4(),
          name: row['name'] || row['Name'] || row['Customer Name'] || 'Unknown',
          phone: String(row['phone'] || row['Phone'] || row['Mobile'] || row['Contact'] || ''),
          email: row['email'] || row['Email'] || null,
          alternatePhone: row['alternatePhone'] || row['Alternate Phone'] ? String(row['alternatePhone'] || row['Alternate Phone']) : null,
          address: row['address'] || row['Address'] ? String(row['address'] || row['Address']) : null,
          city: row['city'] || row['City'] || null,
          state: row['state'] || row['State'] || null,
          pincode: row['pincode'] || row['Pincode'] || row['PIN'] ? String(row['pincode'] || row['Pincode'] || row['PIN']) : null,
          source: row['source'] || row['Source'] || 'Excel Import',
          campaign: row['campaign'] || row['Campaign'] || null,
          customerRequirement: row['customerRequirement'] || row['Customer Requirement'] || row['Requirement'] || null,
          status: 'won',
          priority: 'medium',
          notes: row['notes'] || row['Notes'] || row['Remarks'] || null,
          createdAt: row['createdAt'] ? new Date(row['createdAt']) : new Date(),
          updatedAt: new Date(),
        };
        
        // Skip if phone is empty
        if (!leadData.phone || leadData.phone.trim() === '') {
          skipped++;
          continue;
        }
        
        // Create lead
        await prisma.lead.create({
          data: leadData
        });
        
        imported++;
        
        if (imported % 50 === 0) {
          console.log(`  Imported ${imported} leads...`);
        }
        
      } catch (error: any) {
        errors++;
        console.error(`❌ Error importing row: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Import completed!`);
    console.log(`  ✓ Successfully imported: ${imported}`);
    console.log(`  ⊘ Skipped (no phone): ${skipped}`);
    console.log(`  ✗ Errors: ${errors}`);
    
    // Show final stats
    const totalWonLeads = await prisma.lead.count({
      where: { status: 'won' }
    });
    
    const totalLeads = await prisma.lead.count();
    
    console.log(`\n📊 Database stats:`);
    console.log(`  Total leads: ${totalLeads}`);
    console.log(`  Won leads: ${totalWonLeads}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importWonLeads();
