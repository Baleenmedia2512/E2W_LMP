const xlsx = require('xlsx');
const path = require('path');

// Read the Excel file
const filePath = path.join(__dirname, 'transformed-leads-gomathi-UPDATED-with-DOFL_final.xlsx');
console.log('Reading Excel file:', filePath);

try {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  console.log('\nSheet Name:', sheetName);
  
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);
  
  console.log('\nTotal Rows:', data.length);
  console.log('\n=== SAMPLE DATA (First 3 rows) ===');
  console.log(JSON.stringify(data.slice(0, 3), null, 2));
  
  console.log('\n=== COLUMN HEADERS ===');
  if (data.length > 0) {
    console.log(Object.keys(data[0]));
  }
  
  // Validate data format
  console.log('\n=== DATA VALIDATION ===');
  
  const requiredFields = ['name', 'phone', 'source'];
  const optionalFields = ['email', 'alternatePhone', 'address', 'city', 'state', 'pincode', 
                          'campaign', 'customerRequirement', 'status', 'priority', 'notes'];
  
  let validationErrors = [];
  
  data.forEach((row, index) => {
    const rowNum = index + 1;
    
    // Check required fields
    requiredFields.forEach(field => {
      if (!row[field] || row[field].toString().trim() === '') {
        validationErrors.push(`Row ${rowNum}: Missing required field '${field}'`);
      }
    });
    
    // Validate phone number format (should be string or number)
    if (row.phone) {
      const phoneStr = row.phone.toString().trim();
      if (phoneStr.length < 10) {
        validationErrors.push(`Row ${rowNum}: Invalid phone number '${phoneStr}' (too short)`);
      }
    }
    
    // Validate email format if present
    if (row.email && row.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row.email)) {
        validationErrors.push(`Row ${rowNum}: Invalid email format '${row.email}'`);
      }
    }
    
    // Validate status values
    const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'lost', 'follow_up'];
    if (row.status && !validStatuses.includes(row.status.toLowerCase())) {
      validationErrors.push(`Row ${rowNum}: Invalid status '${row.status}'. Valid values: ${validStatuses.join(', ')}`);
    }
    
    // Validate priority values
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (row.priority && !validPriorities.includes(row.priority.toLowerCase())) {
      validationErrors.push(`Row ${rowNum}: Invalid priority '${row.priority}'. Valid values: ${validPriorities.join(', ')}`);
    }
  });
  
  if (validationErrors.length > 0) {
    console.log('\n❌ VALIDATION ERRORS FOUND:');
    validationErrors.slice(0, 20).forEach(error => console.log('  -', error));
    if (validationErrors.length > 20) {
      console.log(`  ... and ${validationErrors.length - 20} more errors`);
    }
  } else {
    console.log('\n✅ All data validated successfully!');
  }
  
  // Summary statistics
  console.log('\n=== SUMMARY ===');
  console.log('Total records:', data.length);
  console.log('Validation errors:', validationErrors.length);
  
  // Export a sample of properly formatted data
  console.log('\n=== EXPECTED DB FORMAT SAMPLE ===');
  if (data.length > 0) {
    const sampleFormatted = {
      id: 'UUID (auto-generated)',
      name: data[0].name || 'REQUIRED',
      phone: data[0].phone?.toString() || 'REQUIRED',
      email: data[0].email || null,
      alternatePhone: data[0].alternatePhone?.toString() || null,
      address: data[0].address || null,
      city: data[0].city || null,
      state: data[0].state || null,
      pincode: data[0].pincode?.toString() || null,
      source: data[0].source || 'REQUIRED',
      campaign: data[0].campaign || null,
      customerRequirement: data[0].customerRequirement || null,
      status: data[0].status || 'new',
      priority: data[0].priority || 'medium',
      notes: data[0].notes || null,
      metadata: null,
      assignedToId: null,
      createdById: null,
      createdAt: 'DateTime (auto)',
      updatedAt: 'DateTime (auto)',
      callAttempts: 0
    };
    console.log(JSON.stringify(sampleFormatted, null, 2));
  }
  
} catch (error) {
  console.error('Error reading Excel file:', error.message);
  process.exit(1);
}
