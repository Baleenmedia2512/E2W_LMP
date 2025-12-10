# URGENT FIX: Add Environment Variables to Vercel
# Your webhooks are failing with 401 error because META_APP_SECRET is missing

Write-Host "`n🚨 URGENT: WEBHOOK FAILING - 401 ERROR" -ForegroundColor Red
Write-Host "========================================`n" -ForegroundColor Red

Write-Host "Meta is sending webhooks but getting 401 Unauthorized errors!" -ForegroundColor Yellow
Write-Host "This means META_APP_SECRET is missing in Vercel Production.`n" -ForegroundColor Yellow

Write-Host "📋 YOU MUST ADD THESE TO VERCEL NOW:`n" -ForegroundColor Cyan

Write-Host "1. Go to: https://vercel.com/baleen-medias-projects/e2-w-lmp" -ForegroundColor White
Write-Host "2. Click: Settings → Environment Variables" -ForegroundColor White
Write-Host "3. Add these 4 variables (select 'Production' environment):`n" -ForegroundColor White

Write-Host "   Variable #1:" -ForegroundColor Yellow
Write-Host "   Name:  META_ACCESS_TOKEN" -ForegroundColor Green
Write-Host "   Value: EAAWnNnjnCxIBQOD8CHKD34TxdqDXY0meVqoH5i5wIjGiQZCgKMCQlZAF5SwAbNPPbCST8TkCtsQ8cS1LSbMit2KF6P51Eh1ijzG6TvnWrAotIpFIHZCySkZC7bnU9SyiaZCUUmDWjot3IjqkhLMHZBwh4LVrfn5rgiVHykTOKu6kq1OVxZCP4u8UqWtHVE8lajpPdVE3yYt" -ForegroundColor White
Write-Host "   Environment: ✓ Production`n" -ForegroundColor Cyan

Write-Host "   Variable #2:" -ForegroundColor Yellow
Write-Host "   Name:  META_APP_SECRET" -ForegroundColor Green
Write-Host "   Value: d027d066c388978723bb4e378c93f576" -ForegroundColor White
Write-Host "   Environment: ✓ Production`n" -ForegroundColor Cyan

Write-Host "   Variable #3:" -ForegroundColor Yellow
Write-Host "   Name:  META_PAGE_ID" -ForegroundColor Green
Write-Host "   Value: 1552034478376801" -ForegroundColor White
Write-Host "   Environment: ✓ Production`n" -ForegroundColor Cyan

Write-Host "   Variable #4:" -ForegroundColor Yellow
Write-Host "   Name:  META_WEBHOOK_VERIFY_TOKEN" -ForegroundColor Green
Write-Host "   Value: E2W_LMP_META_WEBHOOK_2025" -ForegroundColor White
Write-Host "   Environment: ✓ Production`n" -ForegroundColor Cyan

Write-Host "4. Click 'Save' for each variable" -ForegroundColor White
Write-Host "5. Go to: Deployments tab" -ForegroundColor White
Write-Host "6. Click '...' menu on latest deployment" -ForegroundColor White
Write-Host "7. Click 'Redeploy'" -ForegroundColor White
Write-Host "8. Wait 2 minutes for deployment to complete`n" -ForegroundColor White

Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "After redeployment:" -ForegroundColor Green
Write-Host "  1. Submit a new test lead via Facebook" -ForegroundColor White
Write-Host "  2. Wait 30 seconds" -ForegroundColor White
Write-Host "  3. Lead should appear in database!" -ForegroundColor White
Write-Host "  4. Check Meta Dashboard - should show 200 OK instead of 401`n" -ForegroundColor White

Write-Host "📊 Current Issue:" -ForegroundColor Yellow
Write-Host "  Status: failure (401)" -ForegroundColor Red
Write-Host "  Error: webhooks.delivery.rejected" -ForegroundColor Red
Write-Host "  Cause: META_APP_SECRET missing in Vercel`n" -ForegroundColor Red

Write-Host "✅ After Fix:" -ForegroundColor Green
Write-Host "  Status: success (200)" -ForegroundColor Green
Write-Host "  Leads will save automatically" -ForegroundColor Green
Write-Host "  Webhook will work in real-time`n" -ForegroundColor Green

Write-Host "🔗 Quick Links:" -ForegroundColor Cyan
Write-Host "  Vercel: https://vercel.com/baleen-medias-projects/e2-w-lmp/settings/environment-variables" -ForegroundColor Blue
Write-Host "  Meta Dashboard: https://developers.facebook.com/apps/1591227282033426/webhooks/" -ForegroundColor Blue

Write-Host "`n========================================`n" -ForegroundColor Cyan

$response = Read-Host "Press Enter after you've added the variables and redeployed"

Write-Host "`n✅ Great! Now test:" -ForegroundColor Green
Write-Host "  1. Submit a test lead on Facebook" -ForegroundColor White
Write-Host "  2. Run: npm run diagnose:lead-not-saving" -ForegroundColor White
Write-Host "  3. Check if new lead appears" -ForegroundColor White
Write-Host ""
