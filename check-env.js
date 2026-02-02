// Display the connection strings (masked) to verify format
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

console.log('=== Environment Variables Check ===\n');

const dbUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_DATABASE_URL;

if (dbUrl) {
  // Mask password but show structure
  const masked = dbUrl.replace(/:([^@]+)@/, ':***PASSWORD***@');
  console.log('DATABASE_URL structure:');
  console.log(masked);
  console.log('');
  
  // Parse the URL
  try {
    const url = new URL(dbUrl);
    console.log('Parsed DATABASE_URL:');
    console.log('- Protocol:', url.protocol);
    console.log('- Username:', url.username);
    console.log('- Password:', url.password ? `${url.password.substring(0, 3)}***${url.password.substring(url.password.length - 2)}` : 'NOT SET');
    console.log('- Host:', url.hostname);
    console.log('- Port:', url.port);
    console.log('- Database:', url.pathname.substring(1));
    console.log('- Search params:', url.search);
  } catch (e) {
    console.log('Failed to parse URL:', e.message);
  }
} else {
  console.log('DATABASE_URL: NOT SET');
}

console.log('\n' + '='.repeat(50) + '\n');

if (directUrl) {
  const masked = directUrl.replace(/:([^@]+)@/, ':***PASSWORD***@');
  console.log('DIRECT_DATABASE_URL structure:');
  console.log(masked);
} else {
  console.log('DIRECT_DATABASE_URL: NOT SET');
}

console.log('\n' + '='.repeat(50));
console.log('\n⚠️  If credentials look correct, check:');
console.log('1. Supabase project is active');
console.log('2. Database password in Supabase dashboard');
console.log('3. Connection pooling is enabled');
console.log('4. Your IP is not blocked');
