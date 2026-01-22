import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

async function importTodayLeads() {
  try {
    console.log('📂 Reading Excel file...');
    
    const filePath = 'C:\\xampp\\htdocs\\E2W_LMP\\leads-DB-READY_final for today.xlsx';
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
    const errorDetails: string[] = [];
    
    for (const row of data) {
      try {
        // Map Excel columns to database fields
        const leadData: any = {
          id: row['id'] || row['Id'] || row['ID'],
          name: row['name'] || row['Name'] || 'Unknown',
          phone: String(row['phone'] || row['Phone'] || ''),
          email: row['email'] || row['Email'] || null,
          alternatePhone: row['alternatePhone'] || row['Alternate Phone'] ? String(row['alternatePhone'] || row['Alternate Phone']) : null,
          address: row['address'] || row['Address'] ? String(row['address'] || row['Address']) : null,
          city: row['city'] || row['City'] || null,
          state: row['state'] || row['State'] || null,
          pincode: row['pincode'] || row['Pincode'] ? String(row['pincode'] || row['Pincode']) : null,
          source: row['source'] || row['Source'] || 'Excel Import',
          campaign: row['campaign'] || row['Campaign'] || null,
          customerRequirement: row['customerRequirement'] || row['Customer Requirement'] || null,
          status: row['status'] || row['Status'] || 'new',
          priority: row['priority'] || row['Priority'] || 'medium',
          notes: row['notes'] || row['Notes'] || null,
          metadata: row['metadata'] || row['Metadata'] || null,
          assignedToId: row['assignedToId'] || row['Assigned To Id'] || null,
          createdById: row['createdById'] || row['Created By Id'] || null,
          callAttempts: parseInt(row['callAttempts'] || row['Call Attempts'] || '0') || 0,
          createdAt: row['createdAt'] ? new Date(row['createdAt']) : new Date(),
          updatedAt: row['updatedAt'] ? new Date(row['updatedAt']) : new Date(),
        };
        
        // Skip if phone is empty
        if (!leadData.phone || leadData.phone.trim() === '') {
          skipped++;
          continue;
        }
        
        // Skip if no ID
        if (!leadData.id) {
          skipped++;
          errorDetails.push(`Skipped row - no ID: ${leadData.name}`);
          continue;
        }
        
        // Check if lead already exists
        const existingLead = await prisma.lead.findUnique({
          where: { id: leadData.id }
        });
        
        if (existingLead) {
          // Update existing lead
          await prisma.lead.update({
            where: { id: leadData.id },
            data: {
              ...leadData,
              updatedAt: new Date()
            }
          });
          imported++;
        } else {
          // Create new lead
          await prisma.lead.create({
            data: leadData
          });
          imported++;
        }
        
        if (imported % 50 === 0) {
          console.log(`  Imported ${imported} leads...`);
        }
        
      } catch (error: any) {
        errors++;
        errorDetails.push(`Error: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Import completed!`);
    console.log(`  ✓ Successfully imported/updated: ${imported}`);
    console.log(`  ⊘ Skipped: ${skipped}`);
    console.log(`  ✗ Errors: ${errors}`);
    
    if (errorDetails.length > 0 && errorDetails.length <= 10) {
      console.log('\n📋 Error details:');
      errorDetails.forEach(e => console.log(`  - ${e}`));
    }
    
    // Show final stats
    const totalLeads = await prisma.lead.count();
    const followupLeads = await prisma.lead.count({
      where: { status: 'followup' }
    });
    
    console.log(`\n📊 Database stats:`);
    console.log(`  Total leads: ${totalLeads}`);
    console.log(`  Followup leads: ${followupLeads}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importTodayLeads();
