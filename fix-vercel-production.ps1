# Quick fix: Update Vercel Environment Variables
# This script updates the DATABASE_URL in Vercel to use direct connection

Write-Host "`n=== Updating Vercel Production Database Connection ===" -ForegroundColor Cyan
Write-Host ""

$newDatabaseUrl = "postgresql://postgres:Easy2work%4025@db.wkwrrdcjknvupwsfdjtd.supabase.co:5432/postgres"

Write-Host "The new DATABASE_URL will be set to:" -ForegroundColor Yellow
Write-Host $newDatabaseUrl.Replace("Easy2work%4025", "***PASSWORD***")
Write-Host ""

Write-Host "Option 1: Using Vercel CLI (Recommended)" -ForegroundColor Green
Write-Host "----------------------------------------"
Write-Host "Run these commands:"
Write-Host ""
Write-Host "vercel env rm DATABASE_URL production" -ForegroundColor Cyan
Write-Host "vercel env add DATABASE_URL production" -ForegroundColor Cyan
Write-Host "  (When prompted, paste: $newDatabaseUrl)" -ForegroundColor Gray
Write-Host ""
Write-Host "vercel env rm DIRECT_DATABASE_URL production" -ForegroundColor Cyan
Write-Host "vercel env add DIRECT_DATABASE_URL production" -ForegroundColor Cyan
Write-Host "  (When prompted, paste: $newDatabaseUrl)" -ForegroundColor Gray
Write-Host ""
Write-Host "vercel --prod" -ForegroundColor Cyan
Write-Host ""

Write-Host "Option 2: Using Vercel Dashboard" -ForegroundColor Green
Write-Host "--------------------------------"
Write-Host "1. Go to: https://vercel.com/baleen-medias-projects/e2-w-lmp/settings/environment-variables"
Write-Host "2. Find DATABASE_URL and DIRECT_DATABASE_URL"
Write-Host "3. Edit both and change to:" -ForegroundColor Yellow
Write-Host "   $newDatabaseUrl"
Write-Host "4. Redeploy your application"
Write-Host ""

$choice = Read-Host "Do you want to update now using Vercel CLI? (y/n)"

if ($choice -eq 'y') {
    Write-Host "`nUpdating DATABASE_URL..." -ForegroundColor Yellow
    
    # Remove old value
    vercel env rm DATABASE_URL production --yes 2>$null
    
    # Add new value
    Write-Output $newDatabaseUrl | vercel env add DATABASE_URL production
    
    Write-Host "Updating DIRECT_DATABASE_URL..." -ForegroundColor Yellow
    vercel env rm DIRECT_DATABASE_URL production --yes 2>$null
    Write-Output $newDatabaseUrl | vercel env add DIRECT_DATABASE_URL production
    
    Write-Host "`n✓ Environment variables updated!" -ForegroundColor Green
    Write-Host "`nRedeploying to production..." -ForegroundColor Yellow
    vercel --prod
    
    Write-Host "`n✓ Deployment complete!" -ForegroundColor Green
} else {
    Write-Host "`nPlease update manually using one of the options above." -ForegroundColor Yellow
}
