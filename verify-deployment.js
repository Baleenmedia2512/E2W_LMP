#!/usr/bin/env node

/**
 * Production Deployment Verification Script
 * E2W Lead Manager - PostgreSQL Migration
 * 
 * This script verifies all configurations are correct before deployment
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkMark(passed) {
  return passed ? '✓' : '✗';
}

async function main() {
  log('\n🔍 Production Deployment Verification', 'cyan');
  log('=====================================\n', 'cyan');

  let allChecksPassed = true;
  const checks = [];

  // 1. Check .env.vercel.production exists
  const envPath = path.join(__dirname, '.env.vercel.production');
  const envExists = fs.existsSync(envPath);
  checks.push({ name: 'Environment file exists', passed: envExists });

  if (!envExists) {
    log('✗ .env.vercel.production not found!', 'red');
    allChecksPassed = false;
  } else {
    const envContent = fs.readFileSync(envPath, 'utf8');

    // 2. Check DATABASE_URL is PostgreSQL
    const hasPostgresUrl = envContent.includes('postgresql://') && envContent.includes('supabase.com');
    checks.push({ name: 'DATABASE_URL is PostgreSQL', passed: hasPostgresUrl });
    if (!hasPostgresUrl) allChecksPassed = false;

    // 3. Check DIRECT_DATABASE_URL exists
    const hasDirectUrl = envContent.includes('DIRECT_DATABASE_URL=');
    checks.push({ name: 'DIRECT_DATABASE_URL configured', passed: hasDirectUrl });
    if (!hasDirectUrl) allChecksPassed = false;

    // 4. Check new production URL
    const hasNewUrl = envContent.includes('e2wleadmanager.vercel.app');
    checks.push({ name: 'New production URL configured', passed: hasNewUrl });
    if (!hasNewUrl) allChecksPassed = false;

    // 5. Check old URL is not present
    const hasOldUrl = envContent.includes('e2-w-lmp.vercel.app');
    checks.push({ name: 'Old URL removed', passed: !hasOldUrl });
    if (hasOldUrl) allChecksPassed = false;

    // 6. Check Meta credentials present
    const hasMeta = envContent.includes('META_ACCESS_TOKEN') && 
                    envContent.includes('META_APP_SECRET') &&
                    envContent.includes('META_PAGE_ID');
    checks.push({ name: 'Meta credentials present', passed: hasMeta });
    if (!hasMeta) allChecksPassed = false;

    // 7. Check secrets present
    const hasSecrets = envContent.includes('JWT_SECRET') && 
                       envContent.includes('NEXTAUTH_SECRET');
    checks.push({ name: 'Authentication secrets present', passed: hasSecrets });
    if (!hasSecrets) allChecksPassed = false;
  }

  // 8. Check Prisma schema
  const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
  const schemaExists = fs.existsSync(schemaPath);
  checks.push({ name: 'Prisma schema exists', passed: schemaExists });

  if (schemaExists) {
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    const isPostgres = schemaContent.includes('provider  = "postgresql"');
    checks.push({ name: 'Prisma schema uses PostgreSQL', passed: isPostgres });
    if (!isPostgres) allChecksPassed = false;

    const hasDirectUrl = schemaContent.includes('directUrl = env("DIRECT_DATABASE_URL")');
    checks.push({ name: 'Prisma schema has directUrl', passed: hasDirectUrl });
    if (!hasDirectUrl) allChecksPassed = false;
  } else {
    allChecksPassed = false;
  }

  // 9. Check package.json
  const packagePath = path.join(__dirname, 'package.json');
  const packageExists = fs.existsSync(packagePath);
  checks.push({ name: 'package.json exists', passed: packageExists });

  if (packageExists) {
    const packageContent = fs.readFileSync(packagePath, 'utf8');
    const hasMysql2 = packageContent.includes('"mysql2"');
    checks.push({ name: 'mysql2 dependency removed', passed: !hasMysql2 });
    if (hasMysql2) {
      log('  ⚠️  Warning: mysql2 still in dependencies', 'yellow');
    }
  }

  // 10. Check vercel.json
  const vercelPath = path.join(__dirname, 'vercel.json');
  const vercelExists = fs.existsSync(vercelPath);
  checks.push({ name: 'vercel.json exists', passed: vercelExists });

  // Display results
  log('\n📋 Verification Results:', 'bold');
  log('========================\n', 'bold');

  checks.forEach(check => {
    const symbol = check.passed ? '✓' : '✗';
    const color = check.passed ? 'green' : 'red';
    log(`${symbol} ${check.name}`, color);
  });

  log('\n' + '='.repeat(40) + '\n');

  if (allChecksPassed) {
    log('✅ ALL CHECKS PASSED!', 'green');
    log('🚀 Your application is READY FOR DEPLOYMENT\n', 'green');
    
    log('Next Steps:', 'cyan');
    log('1. Deploy to Vercel: vercel --prod', 'yellow');
    log('2. Update Meta webhook URL to:', 'yellow');
    log('   https://e2wleadmanager.vercel.app/api/webhooks/meta-leads', 'cyan');
    log('3. Test the deployment using DEPLOYMENT_CHECKLIST.md\n', 'yellow');
    
    return 0;
  } else {
    log('❌ SOME CHECKS FAILED!', 'red');
    log('⚠️  Please review and fix the issues above before deploying\n', 'yellow');
    return 1;
  }
}

// Run verification
main()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    log(`\n❌ Verification failed with error: ${error.message}`, 'red');
    process.exit(1);
  });
