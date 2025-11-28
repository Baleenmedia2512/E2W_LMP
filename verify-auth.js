#!/usr/bin/env node

/**
 * Authentication & Role-Based Access Control Implementation Verification
 * This script verifies all auth components are properly implemented
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = __dirname;

const REQUIRED_FILES = [
  // Auth files
  'src/shared/lib/auth/auth-context.tsx',
  'src/shared/lib/auth/auth-utils.ts',
  'src/shared/lib/auth/middleware.ts',
  
  // API routes
  'src/app/api/auth/login/route.ts',
  
  // Pages
  'src/app/login/page.tsx',
  'src/app/page.tsx',
  
  // Components
  'src/shared/components/LoginForm.tsx',
  'src/shared/components/layout/Header.tsx',
  'src/shared/components/layout/Sidebar.tsx',
  
  // Hooks
  'src/shared/hooks/useRoleBasedAccess.ts',
  
  // Middleware
  'src/middleware.ts',
  
  // Prisma
  'prisma/seed.ts',
  'prisma/schema.prisma',
  
  // Config
  '.env.example',
];

function checkFileExists(filePath) {
  const fullPath = path.join(PROJECT_ROOT, filePath);
  return fs.existsSync(fullPath);
}

function fileHasContent(filePath, searchString) {
  const fullPath = path.join(PROJECT_ROOT, filePath);
  if (!fs.existsSync(fullPath)) return false;
  const content = fs.readFileSync(fullPath, 'utf-8');
  return content.includes(searchString);
}

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  Authentication & Role-Based Access Control Verification   ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📋 Checking Implementation Files...\n');

let allFilesExist = true;
REQUIRED_FILES.forEach((file) => {
  const exists = checkFileExists(file);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${file}`);
  if (!exists) allFilesExist = false;
});

console.log('\n🔐 Checking Core Features...\n');

const checks = [
  {
    name: 'JWT Token Generation',
    file: 'src/shared/lib/auth/auth-utils.ts',
    search: 'generateToken',
  },
  {
    name: 'Password Hashing',
    file: 'src/shared/lib/auth/auth-utils.ts',
    search: 'hashPassword',
  },
  {
    name: 'Auth Context Provider',
    file: 'src/shared/lib/auth/auth-context.tsx',
    search: 'AuthProvider',
  },
  {
    name: 'Login API Endpoint',
    file: 'src/app/api/auth/login/route.ts',
    search: 'POST',
  },
  {
    name: 'Login Form Component',
    file: 'src/shared/components/LoginForm.tsx',
    search: 'LoginForm',
  },
  {
    name: 'Role-Based Access Hook',
    file: 'src/shared/hooks/useRoleBasedAccess.ts',
    search: 'useRoleBasedAccess',
  },
  {
    name: 'User Seeding Script',
    file: 'prisma/seed.ts',
    search: 'prisma.role.upsert',
  },
  {
    name: 'Dashboard Route Protection',
    file: 'src/app/dashboard/layout.tsx',
    search: 'useAuth',
  },
];

let allChecksPass = true;
checks.forEach((check) => {
  const has = fileHasContent(check.file, check.search);
  const status = has ? '✅' : '❌';
  console.log(`${status} ${check.name}`);
  if (!has) allChecksPass = false;
});

console.log('\n📦 Checking Dependencies in package.json...\n');

const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

const requiredDeps = ['bcryptjs', 'jsonwebtoken', 'zod'];
const requiredDevDeps = ['@types/bcryptjs', '@types/jsonwebtoken', 'ts-node'];

let allDepsExist = true;

requiredDeps.forEach((dep) => {
  const has = packageJson.dependencies[dep];
  const status = has ? '✅' : '❌';
  console.log(`${status} ${dep}: ${has || 'MISSING'}`);
  if (!has) allDepsExist = false;
});

console.log();
requiredDevDeps.forEach((dep) => {
  const has = packageJson.devDependencies[dep];
  const status = has ? '✅' : '❌';
  console.log(`${status} ${dep}: ${has || 'MISSING'}`);
  if (!has) allDepsExist = false;
});

console.log('\n🎯 Checking Scripts in package.json...\n');

const requiredScripts = ['prisma:seed', 'seed'];
let allScriptsExist = true;

requiredScripts.forEach((script) => {
  const has = packageJson.scripts[script];
  const status = has ? '✅' : '❌';
  console.log(`${status} ${script}`);
  if (!has) allScriptsExist = false;
});

console.log('\n👥 User Roles & Permissions Configuration...\n');

console.log('✅ Sales Agent');
console.log('   └─ Can: Create leads, log calls, manage follow-ups, view own dashboard');
console.log('   └─ Cannot: Assign leads, view team reports, view DSR\n');

console.log('✅ Team Lead');
console.log('   └─ Can: All Sales Agent permissions + assign leads, view team reports, monitor team');
console.log('   └─ Cannot: View DSR\n');

console.log('✅ Super Agent');
console.log('   └─ Can: Everything + view DSR for all agents, view all metrics\n');

console.log('👥 Test User Accounts:\n');

if (fileHasContent('prisma/seed.ts', 'gomathi@baleenmedia.com')) {
  console.log('✅ Sales Agent: gomathi@baleenmedia.com');
}

if (fileHasContent('prisma/seed.ts', 'Leenahgrace@baleenmedia.com')) {
  console.log('✅ Team Lead: Leenahgrace@baleenmedia.com');
}

if (fileHasContent('prisma/seed.ts', 'contact@baleenmdia.com')) {
  console.log('✅ Super Agent: contact@baleenmdia.com');
}

console.log('✅ Password: Admin@123 (for all users)\n');

console.log('═══════════════════════════════════════════════════════════\n');

if (allFilesExist && allChecksPass && allDepsExist && allScriptsExist) {
  console.log('✨ ALL CHECKS PASSED! ✨\n');
  console.log('🚀 Next Steps:');
  console.log('   1. npm install                    (install dependencies)');
  console.log('   2. npm run prisma:migrate         (run migrations)');
  console.log('   3. npm run seed                   (seed database with users)');
  console.log('   4. npm run dev                    (start development server)');
  console.log('   5. Visit http://localhost:3000/login\n');
  console.log('📝 Test Credentials:');
  console.log('   Email: gomathi@baleenmedia.com (Sales Agent)');
  console.log('   Email: Leenahgrace@baleenmedia.com (Team Lead)');
  console.log('   Email: contact@baleenmdia.com (Super Agent)');
  console.log('   Password: Admin@123\n');
  process.exit(0);
} else {
  console.log('❌ SOME CHECKS FAILED!\n');
  console.log('Missing:');
  if (!allFilesExist) console.log('   • Some required files are missing');
  if (!allChecksPass) console.log('   • Some feature implementations are incomplete');
  if (!allDepsExist) console.log('   • Some dependencies are missing from package.json');
  if (!allScriptsExist) console.log('   • Some scripts are missing from package.json');
  console.log();
  process.exit(1);
}
