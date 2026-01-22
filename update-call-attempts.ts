import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function updateCallAttempts() {
  try {
    // Read the Excel file
    const filePath = 'leads-DB-READY_final for today_followup_ccccccccccccc.xlsx';
    
    if (!fs.existsSync(filePath)) {
      console.error(`Error: File not found at ${filePath}`);
      return;
    }

    console.log(`Reading Excel file: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${data.length} rows in Excel file`);

    if (data.length === 0) {
      console.log('No data found in Excel file');
      return;
    }

    // Extract phone numbers from the Excel file
    const phoneNumbers = data.map((row: any) => {
      // Try different possible column names for phone
      return row.phone || row.Phone || row.PHONE || 
             row.phoneNumber || row.PhoneNumber || 
             row['Phone Number'] || row.mobile || row.Mobile;
    }).filter(Boolean);

    console.log(`Extracted ${phoneNumbers.length} phone numbers from Excel`);

    if (phoneNumbers.length === 0) {
      console.log('No phone numbers found in Excel file');
      console.log('Available columns:', Object.keys(data[0]));
      return;
    }

    // Clean phone numbers (remove spaces, dashes, etc.)
    const cleanedPhones = phoneNumbers.map((phone: string) => 
      String(phone).replace(/\D/g, '').trim()
    );

    console.log('\nSample phone numbers from Excel:');
    console.log(cleanedPhones.slice(0, 5));

    // Find leads in database with these phone numbers
    const leadsToUpdate = await prisma.lead.findMany({
      where: {
        phone: {
          in: cleanedPhones
        }
      },
      select: {
        id: true,
        phone: true,
        name: true,
        callAttempts: true
      }
    });

    console.log(`\nFound ${leadsToUpdate.length} matching leads in database`);

    if (leadsToUpdate.length === 0) {
      console.log('\nNo matching leads found in database');
      console.log('Checking first few leads in DB...');
      
      const sampleLeads = await prisma.lead.findMany({
        take: 5,
        select: {
          id: true,
          phone: true,
          name: true,
          callAttempts: true
        }
      });
      
      console.log('\nSample leads from database:');
      console.log(sampleLeads);
      return;
    }

    // Show current status
    console.log('\nCurrent callAttempts status:');
    const currentStatus = leadsToUpdate.reduce((acc: any, lead) => {
      acc[lead.callAttempts] = (acc[lead.callAttempts] || 0) + 1;
      return acc;
    }, {});
    console.log(currentStatus);

    // Filter leads with callAttempts = 0
    const leadsWithZeroAttempts = leadsToUpdate.filter(lead => lead.callAttempts === 0);
    console.log(`\nLeads with callAttempts = 0: ${leadsWithZeroAttempts.length}`);
    
    if (leadsWithZeroAttempts.length === 0) {
      console.log('No leads with callAttempts = 0 found. Nothing to update.');
      return;
    }

    // Update ONLY leads with callAttempts = 0 to 1
    console.log(`\nUpdating callAttempts to 1 for ${leadsWithZeroAttempts.length} leads...`);
    
    const updateResult = await prisma.lead.updateMany({
      where: {
        id: {
          in: leadsWithZeroAttempts.map(lead => lead.id)
        },
        callAttempts: 0  // Extra safety check
      },
      data: {
        callAttempts: 1
      }
    });

    console.log(`\n✅ Successfully updated ${updateResult.count} leads`);

    // Verify the update
    const verifyLeads = await prisma.lead.findMany({
      where: {
        id: {
          in: leadsToUpdate.map(lead => lead.id)
        }
      },
      select: {
        id: true,
        phone: true,
        name: true,
        callAttempts: true
      }
    });

    console.log('\nVerification - Updated callAttempts status:');
    const updatedStatus = verifyLeads.reduce((acc: any, lead) => {
      acc[lead.callAttempts] = (acc[lead.callAttempts] || 0) + 1;
      return acc;
    }, {});
    console.log(updatedStatus);

    console.log('\nSample updated leads:');
    console.log(verifyLeads.slice(0, 5).map(l => ({
      name: l.name,
      phone: l.phone,
      callAttempts: l.callAttempts
    })));

  } catch (error) {
    console.error('Error updating call attempts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateCallAttempts();
