import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function revertCallAttempts() {
  try {
    // Read the Excel file to get the phone numbers
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

    // Extract phone numbers from the Excel file
    const phoneNumbers = data.map((row: any) => {
      return row.phone || row.Phone || row.PHONE || 
             row.phoneNumber || row.PhoneNumber || 
             row['Phone Number'] || row.mobile || row.Mobile;
    }).filter(Boolean);

    const cleanedPhones = phoneNumbers.map((phone: string) => 
      String(phone).replace(/\D/g, '').trim()
    );

    console.log(`Extracted ${cleanedPhones.length} phone numbers from Excel`);

    // Find all leads with these phone numbers
    const leads = await prisma.lead.findMany({
      where: {
        phone: {
          in: cleanedPhones
        }
      },
      include: {
        CallLog: {
          select: {
            id: true
          }
        }
      }
    });

    console.log(`\nFound ${leads.length} matching leads in database`);
    console.log('Reverting callAttempts based on actual CallLog records...\n');

    let updatedCount = 0;
    let revertedStats = {
      setTo0: 0,
      setTo1: 0,
      setTo2: 0,
      setTo3: 0,
      setTo4plus: 0
    };

    // Update each lead based on their actual call log count
    for (const lead of leads) {
      const actualCallCount = lead.CallLog.length;
      
      if (lead.callAttempts !== actualCallCount) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { callAttempts: actualCallCount }
        });
        updatedCount++;
        
        // Track stats
        if (actualCallCount === 0) revertedStats.setTo0++;
        else if (actualCallCount === 1) revertedStats.setTo1++;
        else if (actualCallCount === 2) revertedStats.setTo2++;
        else if (actualCallCount === 3) revertedStats.setTo3++;
        else revertedStats.setTo4plus++;
      }
    }

    console.log(`✅ Successfully reverted ${updatedCount} leads`);
    console.log('\nReverted callAttempts distribution:');
    console.log(`  0 attempts: ${revertedStats.setTo0} leads`);
    console.log(`  1 attempt:  ${revertedStats.setTo1} leads`);
    console.log(`  2 attempts: ${revertedStats.setTo2} leads`);
    console.log(`  3 attempts: ${revertedStats.setTo3} leads`);
    console.log(`  4+ attempts: ${revertedStats.setTo4plus} leads`);

    // Verify final state
    const verifyLeads = await prisma.lead.findMany({
      where: {
        phone: {
          in: cleanedPhones
        }
      },
      select: {
        callAttempts: true
      }
    });

    const finalStatus = verifyLeads.reduce((acc: any, lead) => {
      acc[lead.callAttempts] = (acc[lead.callAttempts] || 0) + 1;
      return acc;
    }, {});

    console.log('\nFinal callAttempts status:');
    console.log(finalStatus);

  } catch (error) {
    console.error('Error reverting call attempts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

revertCallAttempts();
