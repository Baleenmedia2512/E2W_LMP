const xlsx = require('xlsx');
const path = require('path');

// Read the FIXED Excel file
const filePath = path.join(__dirname, 'transformed-leads-gomathi-FIXED.xlsx');
console.log('Final cleanup of Excel file...');

try {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);
  
  // Final cleanup
  const cleanedData = data.map((row, index) => {
    const rowNum = index + 1;
    
    // Fix phone numbers (add leading 0 if missing and length is 9)
    let phone = row.phone?.toString() || '';
    if (phone.length === 9) {
      phone = '0' + phone;
      console.log(`Row ${rowNum}: Fixed phone ${row.phone} -> ${phone}`);
    }
    
    // Keep status as-is (followup without underscore)
    let status = row.status || 'new';
    
    // Properly convert updatedAt from Excel serial date if it's a number
    let updatedAt = row.updatedAt;
    if (typeof updatedAt === 'number') {
      // Excel serial date to JavaScript Date
      const excelEpoch = new Date(1899, 11, 30);
      updatedAt = new Date(excelEpoch.getTime() + updatedAt * 86400000).toISOString();
    } else if (!updatedAt) {
      updatedAt = new Date().toISOString();
    }
    
    // Ensure all columns exist (even if null)
    return {
      id: row.id || null,
      name: row.name || '',
      phone: phone,
      email: row.email || null,
      alternatePhone: row.alternatePhone || null,
      address: row.address || null,
      city: row.city || null,
      state: row.state || null,
      pincode: row.pincode?.toString() || null,
      source: row.source || '',
      campaign: row.campaign || null,
      customerRequirement: row.customerRequirement || null,
      status: status,
      priority: row.priority || 'medium',
      notes: row.notes || null,
      metadata: row.metadata || null,
      assignedToId: row.assignedToId || null,
      createdById: row.createdById || null,
      createdAt: row.createdAt || new Date().toISOString(),
      updatedAt: updatedAt,
      callAttempts: row.callAttempts || 0
    };
  });
  
  // Create final workbook
  const newWorksheet = xlsx.utils.json_to_sheet(cleanedData);
  const newWorkbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, 'Leads');
  
  // Save the final Excel file
  const outputPath = path.join(__dirname, 'leads-ready-for-import-FINAL.xlsx');
  xlsx.writeFile(newWorkbook, outputPath);
  
  console.log('\n✅ FINAL Excel file created:', outputPath);
  console.log('Total records:', cleanedData.length);
  console.log('\nAll columns included:');
  console.log(Object.keys(cleanedData[0]).join(', '));
  
  // Final validation
  let errors = 0;
  cleanedData.forEach((row, index) => {
    if (!row.name || !row.phone || !row.source) {
      errors++;
    }
    if (row.phone && row.phone.length < 10) {
      errors++;
      console.log(`Row ${index + 1}: Still invalid phone: ${row.phone}`);
    }
  });
  
  if (errors === 0) {
    console.log('\n🎉 SUCCESS! File is 100% ready for database import!');
  } else {
    console.log(`\n⚠️  ${errors} issues remaining`);
  }
  
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
