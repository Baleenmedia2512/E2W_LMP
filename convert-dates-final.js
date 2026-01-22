const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'leads-ready-for-import-FINAL_fixxxx.xlsx');
console.log('Processing file:', filePath);

try {
  const workbook = xlsx.readFile(filePath);
  const worksheet = workbook.Sheets['Leads'];
  const data = xlsx.utils.sheet_to_json(worksheet);
  
  console.log('Total rows:', data.length);
  console.log('Processing...\n');
  
  // Transform data
  const fixedData = data.map((row, index) => {
    // Convert updatedAt from Excel serial number to ISO date
    let updatedAt;
    if (typeof row.updatedAt === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      updatedAt = new Date(excelEpoch.getTime() + row.updatedAt * 86400000).toISOString();
    } else if (row.updatedAt) {
      updatedAt = new Date(row.updatedAt).toISOString();
    } else {
      updatedAt = new Date().toISOString();
    }
    
    // Convert createdAt if needed
    let createdAt;
    if (typeof row.createdAt === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      createdAt = new Date(excelEpoch.getTime() + row.createdAt * 86400000).toISOString();
    } else if (row.createdAt) {
      createdAt = new Date(row.createdAt).toISOString();
    } else {
      createdAt = new Date().toISOString();
    }
    
    return {
      id: row.id,
      name: row.name,
      phone: row.phone?.toString() || '',
      email: row.email || null,
      alternatePhone: row.alternatePhone || null,
      address: row.address || null,
      city: row.city || null,
      state: row.state || null,
      pincode: row.pincode?.toString() || null,
      source: row.source || '',
      campaign: row.campaign || null,
      customerRequirement: row.customerRequirement || null,
      status: row.status || 'new',
      priority: row.priority || 'medium',
      notes: row.notes || null,
      metadata: row.metadata || null,
      assignedToId: row.assignedToId || null,
      createdById: row.createdById || null,
      createdAt: createdAt,
      updatedAt: updatedAt,
      callAttempts: row.callAttempts || 0
    };
  });
  
  console.log('✅ Data transformed successfully!');
  console.log('\nSample record:');
  console.log(JSON.stringify(fixedData[0], null, 2));
  
  // Create new workbook
  const newWorksheet = xlsx.utils.json_to_sheet(fixedData);
  const newWorkbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, 'Leads');
  
  // Save
  const outputPath = path.join(__dirname, 'leads-DB-READY.xlsx');
  xlsx.writeFile(newWorkbook, outputPath);
  
  console.log('\n✅ File created:', outputPath);
  
  // Summary
  console.log('\n=== SUMMARY ===');
  console.log('Total records:', fixedData.length);
  console.log('Columns:', Object.keys(fixedData[0]).length);
  console.log('Records with campaign:', fixedData.filter(r => r.campaign).length);
  console.log('\n=== DATE CONVERSION ===');
  console.log('Sample dates:');
  fixedData.slice(0, 3).forEach((r, i) => {
    console.log(`  Record ${i + 1}:`);
    console.log(`    CreatedAt: ${r.createdAt}`);
    console.log(`    UpdatedAt: ${r.updatedAt}`);
  });
  
  console.log('\n🎉 File is ready for database import!');
  
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
