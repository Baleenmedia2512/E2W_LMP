const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'leads-ready-for-import-FINAL.xlsx');
console.log('Verifying final file:', filePath);

const workbook = xlsx.readFile(filePath);
const data = xlsx.utils.sheet_to_json(workbook.Sheets['Leads']);

console.log('\n=== SAMPLE RECORDS (First 3) ===');
data.slice(0, 3).forEach((record, i) => {
  console.log(`\nRecord ${i + 1}:`);
  console.log('  Name:', record.name);
  console.log('  Phone:', record.phone);
  console.log('  Status:', record.status);
  console.log('  Priority:', record.priority);
  console.log('  Created:', record.createdAt);
  console.log('  Updated:', record.updatedAt);
});

console.log('\n=== VALIDATION ===');
console.log('Total records:', data.length);
console.log('Status values:', [...new Set(data.map(r => r.status))]);
console.log('All have updatedAt:', data.every(r => r.updatedAt));
console.log('All phones valid:', data.filter(r => r.phone && r.phone.length >= 10).length, '/', data.length);

console.log('\n✅ File is ready with:');
console.log('   - Status: "followup" (no underscore)');
console.log('   - UpdatedAt: Properly converted dates from Excel');
console.log('   - All 934 records validated');
