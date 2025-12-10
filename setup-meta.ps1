#!/usr/bin/env pwsh

# Meta Webhook Quick Setup Script
# This PowerShell script helps you configure Meta webhooks quickly

Write-Host "`n🚀 META WEBHOOK QUICK SETUP" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Check if .env.meta exists
if (-not (Test-Path ".env.meta")) {
    Write-Host "❌ .env.meta file not found!" -ForegroundColor Red
    Write-Host "Creating template file...`n" -ForegroundColor Yellow
    
    $template = @"
META_ACCESS_TOKEN=PASTE_YOUR_PAGE_ACCESS_TOKEN_HERE
META_APP_SECRET=PASTE_YOUR_APP_SECRET_HERE
META_WEBHOOK_VERIFY_TOKEN=E2W_LMP_META_WEBHOOK_2025
META_PAGE_ID=PASTE_YOUR_PAGE_ID_HERE
NEXT_PUBLIC_APP_URL=https://e2-w-lmp.vercel.app
"@
    
    Set-Content -Path ".env.meta" -Value $template
    Write-Host "✅ Created .env.meta file" -ForegroundColor Green
    Write-Host "📝 Please edit .env.meta and add your Meta credentials`n" -ForegroundColor Yellow
    exit 1
}

# Load environment variables from .env.meta
Write-Host "📋 Loading environment variables from .env.meta...`n" -ForegroundColor Yellow

Get-Content .env.meta | ForEach-Object {
    if ($_ -match '^([^=#]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($key, $value, [System.EnvironmentVariableTarget]::Process)
        
        if ($value -like "*PASTE_YOUR*" -or $value -like "*HERE*") {
            Write-Host "⚠️  $key is not configured!" -ForegroundColor Yellow
        } else {
            Write-Host "✅ $key loaded" -ForegroundColor Green
        }
    }
}

# Check if all required variables are set
$required = @(
    "META_ACCESS_TOKEN",
    "META_APP_SECRET", 
    "META_WEBHOOK_VERIFY_TOKEN",
    "META_PAGE_ID",
    "NEXT_PUBLIC_APP_URL"
)

$missing = @()
foreach ($var in $required) {
    $value = [System.Environment]::GetEnvironmentVariable($var)
    if (-not $value -or $value -like "*PASTE_YOUR*") {
        $missing += $var
    }
}

if ($missing.Count -gt 0) {
    Write-Host "`n❌ Missing required variables:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
    Write-Host "`n📝 Please edit .env.meta and add your actual Meta credentials" -ForegroundColor Yellow
    Write-Host "Then run this script again`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n✅ All environment variables loaded!`n" -ForegroundColor Green

# Ask if user wants to proceed
Write-Host "This will:" -ForegroundColor Cyan
Write-Host "  1. Validate your access token" -ForegroundColor White
Write-Host "  2. Subscribe your app to the page" -ForegroundColor White
Write-Host "  3. Configure webhook fields (leadgen)" -ForegroundColor White
Write-Host "  4. Test your webhook endpoint`n" -ForegroundColor White

$response = Read-Host "Proceed with setup? (Y/N)"

if ($response -ne 'Y' -and $response -ne 'y') {
    Write-Host "`n❌ Setup cancelled`n" -ForegroundColor Yellow
    exit 0
}

Write-Host "`n🔧 Running setup script...`n" -ForegroundColor Cyan

# Check if tsx is available
$tsxExists = Get-Command npx -ErrorAction SilentlyContinue

if (-not $tsxExists) {
    Write-Host "❌ npx command not found. Please install Node.js" -ForegroundColor Red
    exit 1
}

# Run the setup script
try {
    npx tsx scripts/setup-meta-webhook.ts
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Setup completed successfully!" -ForegroundColor Green
        Write-Host "`n📊 Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Submit a test lead via your Facebook Lead Ad form" -ForegroundColor White
        Write-Host "  2. Check webhook health: npm run check:webhook" -ForegroundColor White
        Write-Host "  3. View Vercel logs: https://vercel.com/baleen-medias-projects/e2-w-lmp`n" -ForegroundColor White
    } else {
        Write-Host "`n⚠️  Setup completed with warnings. Check output above." -ForegroundColor Yellow
    }
} catch {
    Write-Host "`n❌ Setup failed: $_" -ForegroundColor Red
    Write-Host "Check the error message above for details" -ForegroundColor Red
    Write-Host ""
    exit 1
}
