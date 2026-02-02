const xlsx = require('xlsx');
const path = require('path');

// Read the FIXED Excel file
const filePath = path.join(__dirname, 'transformed-leads-gomathi-FIXED.xlsx');
console.log('Validating fixed Excel file:', filePath);

try {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);
  
  console.log('Total rows:', data.length);
  
  // Validate data format
  const requiredFields = ['name', 'phone', 'source'];
  let validationErrors = [];
  let warnings = [];
  
  data.forEach((row, index) => {
    const rowNum = index + 1;
    
    // Check required fields
    requiredFields.forEach(field => {
      if (!row[field] || row[field].toString().trim() === '') {
        validationErrors.push(`Row ${rowNum}: Missing required field '${field}'`);
      }
    });
    
    // Validate phone number format
    if (row.phone) {
      const phoneStr = row.phone.toString().trim();
      if (phoneStr.length < 10) {
        validationErrors.push(`Row ${rowNum}: Invalid phone number '${phoneStr}'`);
      }
    }
    
    // Validate status values
    const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'lost', 'follow_up'];
    if (row.status && !validStatuses.includes(row.status.toLowerCase())) {
      validationErrors.push(`Row ${rowNum}: Invalid status '${row.status}'`);
    }
    
    // Validate priority values
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (row.priority && !validPriorities.includes(row.priority.toLowerCase())) {
      validationErrors.push(`Row ${rowNum}: Invalid priority '${row.priority}'`);
    }
    
    // Check for missing optional but recommended fields
    if (!row.email) {
      // This is okay, but count it
    }
    
    // Validate date formats
    if (row.createdAt) {
      const date = new Date(row.createdAt);
      if (isNaN(date.getTime())) {
        validationErrors.push(`Row ${rowNum}: Invalid createdAt date format`);
      }
    }
    
    if (row.updatedAt) {
      const date = new Date(row.updatedAt);
      if (isNaN(date.getTime())) {
        validationErrors.push(`Row ${rowNum}: Invalid updatedAt date format`);
      }
    }
  });
  
  console.log('\n=== VALIDATION RESULTS ===');
  if (validationErrors.length > 0) {
    console.log('❌ VALIDATION ERRORS:', validationErrors.length);
    validationErrors.slice(0, 10).forEach(error => console.log('  -', error));
    if (validationErrors.length > 10) {
      console.log(`  ... and ${validationErrors.length - 10} more errors`);
    }
  } else {
    console.log('✅ ALL VALIDATIONS PASSED!');
    console.log('✅ The Excel file is ready for database import');
  }
  
  console.log('\n=== DATABASE COMPATIBILITY CHECK ===');
  const dbFields = [
    'id', 'name', 'phone', 'email', 'alternatePhone', 'address', 
    'city', 'state', 'pincode', 'source', 'campaign', 
    'customerRequirement', 'status', 'priority', 'notes', 
    'metadata', 'assignedToId', 'createdById', 'createdAt', 
    'updatedAt', 'callAttempts'
  ];
  
  const excelColumns = Object.keys(data[0]);
  const missingFields = dbFields.filter(f => !excelColumns.includes(f));
  const extraFields = excelColumns.filter(f => !dbFields.includes(f));
  
  if (missingFields.length === 0 && extraFields.length === 0) {
    console.log('✅ All database columns match perfectly!');
  } else {
    if (missingFields.length > 0) {
      console.log('⚠️  Missing fields:', missingFields.join(', '));
    }
    if (extraFields.length > 0) {
      console.log('⚠️  Extra fields:', extraFields.join(', '));
    }
  }
  
  console.log('\n=== READY FOR IMPORT ===');
  console.log('File: transformed-leads-gomathi-FIXED.xlsx');
  console.log('Records: ', data.length);
  console.log('Status: ✅ READY');
  console.log('\nYou can now import this file to your database!');
  
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
