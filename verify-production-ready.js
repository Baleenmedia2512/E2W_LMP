#!/usr/bin/env node
/**
 * Production Readiness Verification Script
 * Run this before deploying to ensure all configurations are correct
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Production Readiness...\n');
console.log('='.repeat(60));

let errorCount = 0;
let warningCount = 0;

// Load environment files
function loadEnv(filename) {
  const envPath = path.join(__dirname, filename);
  if (!fs.existsSync(envPath)) {
    return null;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        value = value.replace(/^["']|["']$/g, '');
        env[key] = value;
      }
    }
  });
  
  return env;
}

const localEnv = loadEnv('.env');
const prodEnv = loadEnv('.env.vercel.production');

console.log('\n1️⃣  Checking Database Configuration...');
console.log('-'.repeat(60));

// Check DATABASE_URL
if (prodEnv && prodEnv.DATABASE_URL) {
  if (prodEnv.DATABASE_URL.includes('connection_limit=1')) {
    console.log('❌ ERROR: DATABASE_URL has connection_limit=1');
    console.log('   This will cause connection issues with multiple webhooks');
    console.log('   Remove: ?connection_limit=1 or &connection_limit=1');
    errorCount++;
  } else if (prodEnv.DATABASE_URL.includes('postgresql://')) {
    console.log('✅ DATABASE_URL configured for PostgreSQL');
  } else {
    console.log('⚠️  WARNING: DATABASE_URL might be misconfigured');
    warningCount++;
  }
  
  if (!prodEnv.DATABASE_URL.includes('pgbouncer=true')) {
    console.log('⚠️  WARNING: DATABASE_URL missing pgbouncer=true parameter');
    warningCount++;
  }
} else {
  console.log('❌ ERROR: DATABASE_URL not found in .env.vercel.production');
  errorCount++;
}

// Check DIRECT_URL
if (prodEnv && prodEnv.DIRECT_URL) {
  if (prodEnv.DIRECT_URL.includes(':5432')) {
    console.log('✅ DIRECT_URL configured (port 5432)');
  } else {
    console.log('⚠️  WARNING: DIRECT_URL should use port 5432');
    warningCount++;
  }
} else {
  console.log('❌ ERROR: DIRECT_URL not found (required for Prisma migrations)');
  errorCount++;
}

console.log('\n2️⃣  Checking Meta Configuration...');
console.log('-'.repeat(60));

const requiredMetaVars = [
  'META_APP_ID',
  'META_APP_SECRET', 
  'META_ACCESS_TOKEN',
  'META_PAGE_ID',
  'META_WEBHOOK_VERIFY_TOKEN'
];

requiredMetaVars.forEach(varName => {
  if (prodEnv && prodEnv[varName]) {
    console.log(`✅ ${varName} configured`);
  } else {
    console.log(`❌ ERROR: ${varName} missing`);
    errorCount++;
  }
});

// Check if App ID matches production (should be 847836698417663)
if (prodEnv && prodEnv.META_APP_ID) {
  if (prodEnv.META_APP_ID === '847836698417663' || prodEnv.META_APP_ID === '"847836698417663"') {
    console.log('✅ META_APP_ID matches production value (847836698417663)');
  } else {
    console.log(`⚠️  WARNING: META_APP_ID is ${prodEnv.META_APP_ID}`);
    console.log('   Production was using: 847836698417663');
    warningCount++;
  }
}

console.log('\n3️⃣  Checking Vercel Configuration...');
console.log('-'.repeat(60));

// Check vercel.json
const vercelConfigPath = path.join(__dirname, 'vercel.json');
if (fs.existsSync(vercelConfigPath)) {
  const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
  
  // Check webhook timeout
  if (vercelConfig.functions && vercelConfig.functions['app/api/webhooks/**/*.ts']) {
    const timeout = vercelConfig.functions['app/api/webhooks/**/*.ts'].maxDuration;
    if (timeout >= 30) {
      console.log(`✅ Webhook timeout: ${timeout} seconds (sufficient)`);
    } else {
      console.log(`⚠️  WARNING: Webhook timeout is ${timeout}s (recommend 30s)`);
      warningCount++;
    }
  } else {
    console.log('⚠️  WARNING: No specific webhook timeout configured');
    console.log('   Webhooks will use default 10s timeout');
    warningCount++;
  }
} else {
  console.log('❌ ERROR: vercel.json not found');
  errorCount++;
}

console.log('\n4️⃣  Checking Prisma Configuration...');
console.log('-'.repeat(60));

// Check schema.prisma
const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  if (schema.includes('provider = "postgresql"') || schema.includes('provider  = "postgresql"')) {
    console.log('✅ Prisma schema configured for PostgreSQL');
  } else if (schema.includes('provider = "mysql"')) {
    console.log('❌ ERROR: Prisma schema still configured for MySQL');
    errorCount++;
  }
  
  if (schema.includes('directUrl = env("DIRECT_URL")')) {
    console.log('✅ Prisma schema uses DIRECT_URL for migrations');
  } else {
    console.log('⚠️  WARNING: directUrl configuration might be incorrect');
    warningCount++;
  }
} else {
  console.log('❌ ERROR: prisma/schema.prisma not found');
  errorCount++;
}

console.log('\n5️⃣  Checking Webhook Route...');
console.log('-'.repeat(60));

const webhookRoutePath = path.join(__dirname, 'src', 'app', 'api', 'webhooks', 'meta-leads', 'route.ts');
if (fs.existsSync(webhookRoutePath)) {
  const webhookCode = fs.readFileSync(webhookRoutePath, 'utf8');
  
  // Check for PostgreSQL JSON operators
  if (webhookCode.includes('metadata::jsonb')) {
    console.log('✅ Webhook uses PostgreSQL JSONB operators');
  } else if (webhookCode.includes('JSON_EXTRACT')) {
    console.log('❌ ERROR: Webhook still uses MySQL JSON_EXTRACT');
    errorCount++;
  }
  
  // Check runtime config
  if (webhookCode.includes("runtime = 'nodejs'")) {
    console.log('✅ Webhook runtime: nodejs');
  }
  
  if (webhookCode.includes("dynamic = 'force-dynamic'")) {
    console.log('✅ Webhook dynamic rendering enabled');
  }
} else {
  console.log('❌ ERROR: Webhook route not found');
  errorCount++;
}

console.log('\n6️⃣  Checking Next.js Configuration...');
console.log('-'.repeat(60));

const nextConfigPath = path.join(__dirname, 'next.config.js');
if (fs.existsSync(nextConfigPath)) {
  const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
  
  if (nextConfig.includes('removeConsole: false')) {
    console.log('✅ Console logs preserved for debugging');
  } else if (nextConfig.includes('removeConsole:') && nextConfig.includes('exclude')) {
    console.log('⚠️  WARNING: Some console logs removed in production');
    warningCount++;
  }
} else {
  console.log('❌ ERROR: next.config.js not found');
  errorCount++;
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY');
console.log('='.repeat(60));

if (errorCount === 0 && warningCount === 0) {
  console.log('✅ ALL CHECKS PASSED - Ready for production deployment!');
  console.log('\nNext steps:');
  console.log('1. Commit changes: git add . && git commit -m "Fix production webhook config"');
  console.log('2. Push to deploy: git push origin main');
  console.log('3. Monitor deployment in Vercel dashboard');
  console.log('4. Test webhook: See WEBHOOK_PRODUCTION_DEPLOYMENT.md');
  process.exit(0);
} else {
  console.log(`❌ Found ${errorCount} error(s) and ${warningCount} warning(s)`);
  console.log('\n⚠️  Please fix errors before deploying to production');
  
  if (errorCount > 0) {
    console.log('\nCRITICAL ISSUES that MUST be fixed:');
    console.log('- Review error messages above (marked with ❌)');
    console.log('- Update .env.vercel.production file');
    console.log('- Ensure DATABASE_URL and DIRECT_URL are correct');
    console.log('- Verify all Meta credentials are present');
  }
  
  if (warningCount > 0) {
    console.log('\nWARNINGS (recommended to fix):');
    console.log('- Review warning messages above (marked with ⚠️)');
    console.log('- These won\'t break the app but may affect performance');
  }
  
  process.exit(1);
}
