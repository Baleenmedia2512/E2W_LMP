# Complete Meta Integration Verification Script
# This script checks if everything is configured correctly

Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   META LEAD ADS INTEGRATION - VERIFICATION SCRIPT" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════`n" -ForegroundColor Cyan

$errors = @()
$warnings = @()
$success = 0

# Check 1: Environment File
Write-Host "📋 Checking environment configuration..." -ForegroundColor Yellow

if (Test-Path ".env") {
    Write-Host "   ✅ .env file exists" -ForegroundColor Green
    $success++
    
    $envContent = Get-Content ".env" -Raw
    
    # Check required variables
    $requiredVars = @(
        "META_APP_SECRET",
        "META_WEBHOOK_VERIFY_TOKEN",
        "META_ACCESS_TOKEN",
        "META_PAGE_ID",
        "CRON_SECRET"
    )
    
    foreach ($var in $requiredVars) {
        if ($envContent -match "$var=`"?([^`"`r`n]+)") {
            $value = $matches[1]
            if ($value -and $value -ne "your-" -and $value -notlike "*paste*" -and $value -notlike "*YOUR_*") {
                Write-Host "   ✅ $var is configured" -ForegroundColor Green
                $success++
            } else {
                Write-Host "   ⚠️  $var is not configured (still has placeholder)" -ForegroundColor Yellow
                $warnings += "$var needs to be updated in .env file"
            }
        } else {
            Write-Host "   ❌ $var is missing" -ForegroundColor Red
            $errors += "$var is missing from .env file"
        }
    }
} else {
    Write-Host "   ❌ .env file not found" -ForegroundColor Red
    $errors += ".env file not found. Copy from .env.example"
}

# Check 2: Required Files
Write-Host "`n📁 Checking required files..." -ForegroundColor Yellow

$requiredFiles = @(
    "src\app\api\webhooks\meta-leads\route.ts",
    "src\app\api\cron\sync-meta-leads\route.ts",
    "src\shared\lib\meta\deduplication.ts"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file exists" -ForegroundColor Green
        $success++
    } else {
        Write-Host "   ❌ $file missing" -ForegroundColor Red
        $errors += "$file is missing"
    }
}

# Check 3: Application Running
Write-Host "`n🚀 Checking if application is running..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method GET -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Application is running on localhost:3000" -ForegroundColor Green
    $success++
} catch {
    Write-Host "   ⚠️  Application not running on localhost:3000" -ForegroundColor Yellow
    $warnings += "Start your app with: npm run dev"
}

# Check 4: ngrok Running (for local testing)
Write-Host "`n🌐 Checking ngrok tunnel..." -ForegroundColor Yellow

try {
    $ngrokApi = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -Method GET -ErrorAction Stop
    if ($ngrokApi.tunnels.Count -gt 0) {
        $publicUrl = ($ngrokApi.tunnels | Where-Object { $_.proto -eq "https" }).public_url
        Write-Host "   ✅ ngrok is running" -ForegroundColor Green
        Write-Host "   📍 Public URL: $publicUrl" -ForegroundColor Cyan
        Write-Host "   ℹ️  Use this URL in Meta webhook configuration" -ForegroundColor Gray
        $success++
    } else {
        Write-Host "   ⚠️  ngrok running but no tunnels found" -ForegroundColor Yellow
        $warnings += "ngrok is running but no active tunnels"
    }
} catch {
    Write-Host "   ⚠️  ngrok not running (needed for local testing only)" -ForegroundColor Yellow
    $warnings += "Start ngrok with: ngrok http 3000"
}

# Check 5: Webhook Endpoint
Write-Host "`n🔌 Testing webhook endpoint..." -ForegroundColor Yellow

try {
    $testUrl = "http://localhost:3000/api/webhooks/meta-leads?hub.mode=subscribe&hub.verify_token=E2W_LMP_META_WEBHOOK_2025&hub.challenge=test123"
    $response = Invoke-WebRequest -Uri $testUrl -Method GET -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    
    if ($response.Content -eq "test123") {
        Write-Host "   ✅ Webhook verification endpoint working" -ForegroundColor Green
        $success++
    } else {
        Write-Host "   ❌ Webhook returned unexpected response: $($response.Content)" -ForegroundColor Red
        $errors += "Webhook verification failed"
    }
} catch {
    Write-Host "   ❌ Webhook endpoint not responding" -ForegroundColor Red
    $errors += "Webhook endpoint not accessible: $_"
}

# Check 6: Database Connection
Write-Host "`n🗄️  Checking database..." -ForegroundColor Yellow

try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method GET -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Database connection appears healthy" -ForegroundColor Green
    $success++
} catch {
    Write-Host "   ⚠️  Could not verify database connection" -ForegroundColor Yellow
    $warnings += "Database health check failed"
}

# Check 7: Polling Endpoint
Write-Host "`n🔄 Testing polling endpoint..." -ForegroundColor Yellow

$cronSecret = $env:CRON_SECRET
if (-not $cronSecret) {
    # Try to read from .env
    if (Test-Path ".env") {
        $envContent = Get-Content ".env" -Raw
        if ($envContent -match 'CRON_SECRET=`"?([^`"`r`n]+)') {
            $cronSecret = $matches[1]
        }
    }
}

if ($cronSecret -and $cronSecret -ne "your-secret-key-change-in-production") {
    Write-Host "   ℹ️  CRON_SECRET found, testing endpoint..." -ForegroundColor Gray
    try {
        $headers = @{
            "Authorization" = "Bearer $cronSecret"
        }
        $pollResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/cron/sync-meta-leads" -Method GET -Headers $headers -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        Write-Host "   ✅ Polling endpoint accessible" -ForegroundColor Green
        $success++
    } catch {
        Write-Host "   ⚠️  Polling endpoint not responding" -ForegroundColor Yellow
        $warnings += "Polling endpoint test failed: $_"
    }
} else {
    Write-Host "   ⚠️  CRON_SECRET not configured, skipping test" -ForegroundColor Yellow
    $warnings += "Configure CRON_SECRET to test polling endpoint"
}

# Summary
Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "✅ Successful checks: $success" -ForegroundColor Green
Write-Host "⚠️  Warnings: $($warnings.Count)" -ForegroundColor Yellow
Write-Host "❌ Errors: $($errors.Count)" -ForegroundColor Red

if ($warnings.Count -gt 0) {
    Write-Host "`n⚠️  WARNINGS:" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "   • $warning" -ForegroundColor Yellow
    }
}

if ($errors.Count -gt 0) {
    Write-Host "`n❌ ERRORS:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "   • $error" -ForegroundColor Red
    }
}

# Next Steps
Write-Host "`n📋 NEXT STEPS:" -ForegroundColor Cyan

if ($errors.Count -eq 0) {
    Write-Host "   1. ✅ All critical checks passed!" -ForegroundColor Green
    if ($warnings.Count -gt 0) {
        Write-Host "   2. ⚠️  Address warnings above (optional for production)" -ForegroundColor Yellow
    }
    Write-Host "   3. 📖 Follow WEBHOOK_CREATION_PROCEDURE.md to:" -ForegroundColor Cyan
    Write-Host "      • Create Facebook App" -ForegroundColor Gray
    Write-Host "      • Configure webhook in Meta dashboard" -ForegroundColor Gray
    Write-Host "      • Get Page Access Token" -ForegroundColor Gray
    Write-Host "      • Test with real lead ad" -ForegroundColor Gray
} else {
    Write-Host "   1. ❌ Fix errors listed above first" -ForegroundColor Red
    Write-Host "   2. 📖 Check documentation for help" -ForegroundColor Yellow
    Write-Host "   3. 🔄 Re-run this script after fixing" -ForegroundColor Yellow
}

Write-Host "`n═══════════════════════════════════════════════════════`n" -ForegroundColor Cyan
