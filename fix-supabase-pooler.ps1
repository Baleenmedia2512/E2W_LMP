# Supabase Connection Pooler Configuration for Vercel

Write-Host "`n=== Supabase Pooler Configuration Check ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "The issue:" -ForegroundColor Yellow
Write-Host "- Direct connection (port 5432) works locally but NOT on Vercel"
Write-Host "- Pooler connection (port 6543) gives 'Tenant or user not found'"
Write-Host ""

Write-Host "This usually means:" -ForegroundColor Yellow
Write-Host "1. Connection pooler is not enabled in Supabase"
Write-Host "2. Wrong pooler mode (needs Transaction mode for Prisma)"
Write-Host "3. IPv4 vs IPv6 address issue"
Write-Host ""

Write-Host "SOLUTION:" -ForegroundColor Green
Write-Host "==========" 
Write-Host ""
Write-Host "Go to your Supabase Dashboard:" -ForegroundColor Cyan
Write-Host "https://supabase.com/dashboard/project/wkwrrdcjknvupwsfdjtd/settings/database"
Write-Host ""
Write-Host "1. Check 'Connection Pooling' section" -ForegroundColor Yellow
Write-Host "   - Make sure it's ENABLED"
Write-Host "   - Mode should be: Transaction (recommended for Prisma)"
Write-Host ""
Write-Host "2. Get the CORRECT pooler connection string:" -ForegroundColor Yellow
Write-Host "   - Look for 'Connection string' in Transaction mode"
Write-Host "   - It should look like:"
Write-Host "     postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
Write-Host ""
Write-Host "3. The format might be different from what we have!" -ForegroundColor Red
Write-Host "   Current format: postgresql://postgres:PASSWORD@aws-0-..."
Write-Host "   Might need:     postgresql://postgres.PROJECT-REF:PASSWORD@aws-0-..."
Write-Host ""
Write-Host "4. Copy the EXACT connection string from Supabase dashboard"
Write-Host ""

Write-Host "After getting the correct string, we'll update:" -ForegroundColor Cyan
Write-Host "- Local: Use direct connection (port 5432) - already working"
Write-Host "- Production: Use pooler connection (port 6543) - needs correct format"
Write-Host ""

Write-Host "Press any key to open Supabase dashboard..." -ForegroundColor Green
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
Start-Process "https://supabase.com/dashboard/project/wkwrrdcjknvupwsfdjtd/settings/database"

Write-Host "`nOnce you have the correct pooler connection string, paste it here:"
$poolerUrl = Read-Host "Pooler Connection String"

if ($poolerUrl) {
    Write-Host "`nUpdating Vercel production environment..." -ForegroundColor Yellow
    
    vercel env rm DATABASE_URL production --yes
    Write-Output $poolerUrl | vercel env add DATABASE_URL production
    
    Write-Host "`nKeeping DIRECT_DATABASE_URL for migrations..." -ForegroundColor Yellow
    # DIRECT_DATABASE_URL stays as direct connection for migrations
    
    Write-Host "`n✓ Updated! Redeploying..." -ForegroundColor Green
    vercel --prod --yes
    
    Write-Host "`n✓ Done! Test your production app now." -ForegroundColor Green
} else {
    Write-Host "`nNo connection string provided. Please run this script again." -ForegroundColor Yellow
}
