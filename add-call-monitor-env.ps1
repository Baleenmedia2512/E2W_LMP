# Add Call Monitor API Key to Vercel Production
Write-Host "=== Adding CALL_MONITOR_API_KEY to Vercel Production ===" -ForegroundColor Cyan
Write-Host ""

# Check if vercel CLI is installed
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "ERROR: Vercel CLI not found" -ForegroundColor Red
    Write-Host "Install it with: npm install -g vercel" -ForegroundColor Yellow
    exit 1
}

Write-Host "Adding CALL_MONITOR_API_KEY to production..." -ForegroundColor Yellow
Write-Host ""

# The API key value
$apiKey = "CallMonitor-LMS-SecretKey-2026-Feb-Random-789xyz"

# Remove existing if present (ignore errors)
Write-Host "Removing old value if exists..." -ForegroundColor Gray
vercel env rm CALL_MONITOR_API_KEY production --yes 2>$null

# Add the new value
Write-Host "Adding new value..." -ForegroundColor Yellow
echo $apiKey | vercel env add CALL_MONITOR_API_KEY production

Write-Host ""
Write-Host "SUCCESS: CALL_MONITOR_API_KEY added to production" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Redeploy your application: vercel --prod" -ForegroundColor Yellow
Write-Host "2. Or trigger a redeploy from Vercel Dashboard" -ForegroundColor Yellow
Write-Host ""
Write-Host "After deployment, your Call Monitor app can connect to production LMS" -ForegroundColor Green
