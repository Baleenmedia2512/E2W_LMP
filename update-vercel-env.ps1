# Update Vercel Production Environment Variables
Write-Host "=== Updating Vercel Production Environment Variables ===" -ForegroundColor Cyan
Write-Host ""

# Check if vercel CLI is installed
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "Vercel CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g vercel
}

Write-Host "Updating DATABASE_URL..." -ForegroundColor Yellow
vercel env rm DATABASE_URL production --yes
vercel env add DATABASE_URL production

Write-Host ""
Write-Host "Updating DIRECT_DATABASE_URL..." -ForegroundColor Yellow
vercel env rm DIRECT_DATABASE_URL production --yes
vercel env add DIRECT_DATABASE_URL production

Write-Host ""
Write-Host "✓ Environment variables updated!" -ForegroundColor Green
Write-Host ""
Write-Host "Next step: Redeploy your application" -ForegroundColor Cyan
Write-Host "Run: vercel --prod" -ForegroundColor Yellow
