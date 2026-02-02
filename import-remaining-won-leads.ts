import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function importRemainingLeads() {
  try {
    console.log('📂 Reading Excel file...');
    
    const filePath = 'C:\\xampp\\htdocs\\E2W_LMP\\transformed-leads-gomathi-UPDATED.xlsx';
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`✅ Found ${data.length} rows in Excel file`);
    console.log('🔄 Checking for missing leads...\n');
    
    let imported = 0;
    let alreadyExists = 0;
    let errors = 0;
    
    for (const row of data) {
      try {
        const phone = String(row['phone'] || row['Phone'] || row['Mobile'] || row['Contact'] || '').trim();
        
        if (!phone) {
          continue;
        }
        
        // Check if lead already exists
        const existing = await prisma.lead.findFirst({
          where: {
            phone: phone,
            status: 'won'
          }
        });
        
        if (existing) {
          alreadyExists++;
          continue;
        }
        
        // Map Excel columns to database fields with proper type conversion
        const leadData: any = {
          id: uuidv4(),
          name: row['name'] || row['Name'] || row['Customer Name'] || 'Unknown',
          phone: phone,
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
        
        // Create lead
        await prisma.lead.create({
          data: leadData
        });
        
        imported++;
        console.log(`✓ Imported: ${leadData.name} (${leadData.phone})`);
        
      } catch (error: any) {
        errors++;
        console.error(`❌ Error: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Import completed!`);
    console.log(`  ✓ Successfully imported: ${imported}`);
    console.log(`  ⊘ Already exists: ${alreadyExists}`);
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

importRemainingLeads();
