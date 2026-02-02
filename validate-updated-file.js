const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'leads-DB-READY.xlsx');
console.log('Validating updated file:', filePath);

try {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  console.log('Sheet Name:', sheetName);
  
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);
  
  console.log('\nTotal Rows:', data.length);
  
  console.log('\n=== COLUMN HEADERS ===');
  if (data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log(columns.join(', '));
    console.log('\nTotal columns:', columns.length);
  }
  
  console.log('\n=== SAMPLE DATA (First 3 rows) ===');
  data.slice(0, 3).forEach((row, i) => {
    console.log(`\nRecord ${i + 1}:`);
    console.log('  ID:', row.id);
    console.log('  Name:', row.name);
    console.log('  Phone:', row.phone);
    console.log('  Status:', row.status);
    console.log('  Priority:', row.priority);
    console.log('  Campaign:', row.campaign);
    console.log('  CreatedAt:', row.createdAt);
    console.log('  UpdatedAt:', row.updatedAt);
    console.log('  UpdatedAt Type:', typeof row.updatedAt);
  });
  
  // Validation
  console.log('\n=== VALIDATION CHECKS ===');
  
  const requiredFields = ['id', 'name', 'phone', 'source'];
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
  
  console.log('\n✓ Required fields check:');
  requiredFields.forEach(field => {
    const hasField = excelColumns.includes(field);
    console.log(`  ${hasField ? '✅' : '❌'} ${field}`);
  });
  
  if (missingFields.length > 0) {
    console.log('\n⚠️  Missing DB fields:', missingFields.join(', '));
  } else {
    console.log('\n✅ All DB fields present');
  }
  
  if (extraFields.length > 0) {
    console.log('⚠️  Extra fields:', extraFields.join(', '));
  }
  
  // Check data quality
  let validationIssues = [];
  
  data.forEach((row, index) => {
    const rowNum = index + 1;
    
    // Check required fields
    if (!row.name) validationIssues.push(`Row ${rowNum}: Missing name`);
    if (!row.phone) validationIssues.push(`Row ${rowNum}: Missing phone`);
    if (!row.source) validationIssues.push(`Row ${rowNum}: Missing source`);
    
    // Check phone length
    if (row.phone && row.phone.toString().length < 10) {
      validationIssues.push(`Row ${rowNum}: Invalid phone '${row.phone}'`);
    }
    
    // Check updatedAt format
    if (row.updatedAt) {
      const type = typeof row.updatedAt;
      if (type === 'number') {
        validationIssues.push(`Row ${rowNum}: updatedAt is Excel number (${row.updatedAt}), needs conversion`);
      } else if (type === 'string') {
        // Check if it's valid ISO date
        const date = new Date(row.updatedAt);
        if (isNaN(date.getTime())) {
          validationIssues.push(`Row ${rowNum}: Invalid updatedAt date format '${row.updatedAt}'`);
        }
      }
    }
    
    // Check createdAt format
    if (row.createdAt) {
      const type = typeof row.createdAt;
      if (type === 'number') {
        validationIssues.push(`Row ${rowNum}: createdAt is Excel number, needs conversion`);
      }
    }
  });
  
  console.log('\n=== DATA QUALITY ===');
  if (validationIssues.length > 0) {
    console.log(`❌ Found ${validationIssues.length} issues:`);
    validationIssues.slice(0, 20).forEach(issue => console.log('  -', issue));
    if (validationIssues.length > 20) {
      console.log(`  ... and ${validationIssues.length - 20} more`);
    }
  } else {
    console.log('✅ All data validated successfully!');
  }
  
  // Summary
  console.log('\n=== SUMMARY ===');
  console.log('Total records:', data.length);
  console.log('Columns match DB schema:', missingFields.length === 0 && extraFields.length === 0 ? '✅' : '❌');
  console.log('Data quality:', validationIssues.length === 0 ? '✅' : '❌');
  
  // Check campaign and updatedAt specifically
  const withCampaign = data.filter(r => r.campaign && r.campaign !== null && r.campaign !== '').length;
  const withUpdatedAt = data.filter(r => r.updatedAt).length;
  const updatedAtTypes = [...new Set(data.map(r => typeof r.updatedAt))];
  
  console.log('\n=== YOUR UPDATES ===');
  console.log('Records with campaign:', withCampaign, '/', data.length);
  console.log('Records with updatedAt:', withUpdatedAt, '/', data.length);
  console.log('UpdatedAt data types:', updatedAtTypes.join(', '));
  
  if (validationIssues.length === 0) {
    console.log('\n🎉 File is ready for database import!');
  } else {
    console.log('\n⚠️  File needs fixes before import');
  }
  
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
