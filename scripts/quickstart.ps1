# E2W LMS Quick Start Script (Windows PowerShell)
# This script automates the initial setup process

Write-Host "🚀 E2W Lead Management System - Quick Start" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js >= 18.0.0" -ForegroundColor Red
    exit 1
}

# Check if MySQL is running (via XAMPP)
if (Test-Path "C:\xampp\mysql\bin\mysql.exe") {
    Write-Host "✅ MySQL (XAMPP) is available" -ForegroundColor Green
} else {
    Write-Host "⚠️  MySQL not found in XAMPP directory" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📦 Step 1: Installing dependencies..." -ForegroundColor Cyan
npm install

Write-Host ""
Write-Host "📝 Step 2: Checking environment variables..." -ForegroundColor Cyan
if (-Not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found. Creating from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "⚠️  Please edit .env file with your configuration:" -ForegroundColor Yellow
    Write-Host "   - Set DATABASE_URL" -ForegroundColor Yellow
    Write-Host "   - Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET" -ForegroundColor Yellow
    Write-Host "   - Generate NEXTAUTH_SECRET with: node -e ""console.log(require('crypto').randomBytes(32).toString('base64'))""" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter once you've configured .env file"
} else {
    Write-Host "✅ .env file exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "🗄️  Step 3: Setting up database..." -ForegroundColor Cyan

Write-Host "   Generating Prisma Client..." -ForegroundColor Gray
npx prisma generate

Write-Host "   Running database migrations..." -ForegroundColor Gray
npx prisma migrate dev --name init

Write-Host ""
Write-Host "🌱 Step 4: Seeding database with test data..." -ForegroundColor Cyan
npm run db:seed

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Start development server:" -ForegroundColor White
Write-Host "      npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "   2. Open your browser:" -ForegroundColor White
Write-Host "      http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "   3. Sign in with Google OAuth" -ForegroundColor White
Write-Host ""
Write-Host "📚 For more information:" -ForegroundColor Cyan
Write-Host "   - README.md - General documentation" -ForegroundColor White
Write-Host "   - TESTING_GUIDE.md - Testing and deployment guide" -ForegroundColor White
Write-Host ""
Write-Host "Happy coding! 🚀" -ForegroundColor Green
