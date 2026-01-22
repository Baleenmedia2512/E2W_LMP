const xlsx = require('xlsx');
const path = require('path');

// Read the Excel file
const filePath = path.join(__dirname, 'transformed-leads-gomathi-UPDATED-with-DOFL_final.xlsx');
console.log('Reading Excel file:', filePath);

try {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);
  
  console.log('Total rows to process:', data.length);
  
  // Transform data to match database format
  const fixedData = data.map((row, index) => {
    // Keep status as-is (followup without underscore)
    let status = row.status || 'new';
    
    // Convert "Last update date" Excel serial number to actual date
    let updatedAt = new Date();
    if (row['Last update date'] && typeof row['Last update date'] === 'number') {
      // Excel serial date to JavaScript Date
      const excelEpoch = new Date(1899, 11, 30);
      updatedAt = new Date(excelEpoch.getTime() + row['Last update date'] * 86400000);
    } else if (row.updatedAt) {
      updatedAt = new Date(row.updatedAt);
    }
    
    return {
      id: row.id,
      name: row.name,
      phone: row.phone?.toString() || '',
      email: row.email || null,
      alternatePhone: row.alternatePhone?.toString() || null,
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
      metadata: null,
      assignedToId: row.assignedToId || null,
      createdById: row.createdById || null,
      createdAt: row.createdAt || new Date().toISOString(),
      updatedAt: updatedAt.toISOString(),
      callAttempts: row.callAttempts || 0
    };
  });
  
  console.log('\n✅ Data transformation complete!');
  console.log('Sample fixed record:');
  console.log(JSON.stringify(fixedData[0], null, 2));
  
  // Create new workbook with fixed data
  const newWorksheet = xlsx.utils.json_to_sheet(fixedData);
  const newWorkbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, 'Leads');
  
  // Save the fixed Excel file
  const outputPath = path.join(__dirname, 'transformed-leads-gomathi-FIXED.xlsx');
  xlsx.writeFile(newWorkbook, outputPath);
  
  console.log('\n✅ Fixed Excel file created:', outputPath);
  
  // Validation summary
  console.log('\n=== FIXES APPLIED ===');
  const statusChanges = data.filter(r => r.status === 'followup').length;
  console.log('- Changed "followup" to "follow_up":', statusChanges, 'records');
  console.log('- Added "email" column with null values');
  console.log('- Converted "Last update date" to updatedAt ISO format');
  console.log('- Ensured all required fields are present');
  
  console.log('\n=== COLUMN ORDER ===');
  console.log(Object.keys(fixedData[0]).join(', '));
  
  // Create a summary report
  const summary = {
    totalRecords: fixedData.length,
    statusDistribution: {},
    priorityDistribution: {},
    sourceDistribution: {},
    recordsWithEmail: fixedData.filter(r => r.email).length,
    recordsWithAlternatePhone: fixedData.filter(r => r.alternatePhone).length
  };
  
  fixedData.forEach(record => {
    summary.statusDistribution[record.status] = (summary.statusDistribution[record.status] || 0) + 1;
    summary.priorityDistribution[record.priority] = (summary.priorityDistribution[record.priority] || 0) + 1;
    summary.sourceDistribution[record.source] = (summary.sourceDistribution[record.source] || 0) + 1;
  });
  
  console.log('\n=== DATA SUMMARY ===');
  console.log('Total Records:', summary.totalRecords);
  console.log('\nStatus Distribution:');
  Object.entries(summary.statusDistribution).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
  console.log('\nPriority Distribution:');
  Object.entries(summary.priorityDistribution).forEach(([priority, count]) => {
    console.log(`  ${priority}: ${count}`);
  });
  console.log('\nSource Distribution:');
  Object.entries(summary.sourceDistribution).forEach(([source, count]) => {
    console.log(`  ${source}: ${count}`);
  });
  console.log('\nRecords with email:', summary.recordsWithEmail);
  console.log('Records with alternate phone:', summary.recordsWithAlternatePhone);
  
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
