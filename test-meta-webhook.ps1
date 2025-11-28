# Meta Webhook Test Script
# This simulates a webhook call from Meta to test your endpoint

# Configuration
$WEBHOOK_URL = "http://localhost:3000/api/webhooks/meta-leads"
$APP_SECRET = $env:META_APP_SECRET

if (-not $APP_SECRET) {
    Write-Host "❌ ERROR: META_APP_SECRET environment variable not set!" -ForegroundColor Red
    Write-Host "Run this first: `$env:META_APP_SECRET='your-app-secret'" -ForegroundColor Yellow
    exit 1
}

# Test 1: Webhook Verification (GET request)
Write-Host "`n🔍 Test 1: Webhook Verification..." -ForegroundColor Cyan

$verifyUrl = "$WEBHOOK_URL`?hub.mode=subscribe&hub.verify_token=E2W_LMP_META_WEBHOOK_2025&hub.challenge=test123"

try {
    $response = Invoke-WebRequest -Uri $verifyUrl -Method GET -UseBasicParsing
    if ($response.Content -eq "test123") {
        Write-Host "✅ Webhook verification PASSED!" -ForegroundColor Green
        Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Webhook verification FAILED!" -ForegroundColor Red
        Write-Host "   Expected: test123" -ForegroundColor Yellow
        Write-Host "   Got: $($response.Content)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# Test 2: Sample Lead Data (POST request)
Write-Host "`n📨 Test 2: Sending Sample Lead..." -ForegroundColor Cyan

$samplePayload = @{
    object = "page"
    entry = @(
        @{
            id = "123456789"
            time = 1701177600
            changes = @(
                @{
                    field = "leadgen"
                    value = @{
                        leadgen_id = "test-lead-$(Get-Date -Format 'yyyyMMddHHmmss')"
                        form_id = "test-form-123"
                        page_id = "test-page-456"
                        ad_id = "test-ad-789"
                        adgroup_id = "test-adgroup-101"
                        campaign_id = "test-campaign-202"
                        created_time = "1701177600"
                    }
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

# Calculate signature
$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = [Text.Encoding]::UTF8.GetBytes($APP_SECRET)
$hash = $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($samplePayload))
$signature = "sha256=" + [BitConverter]::ToString($hash).Replace("-", "").ToLower()

Write-Host "   Signature: $signature" -ForegroundColor Gray

try {
    $headers = @{
        "Content-Type" = "application/json"
        "x-hub-signature-256" = $signature
    }
    
    $response = Invoke-WebRequest -Uri $WEBHOOK_URL -Method POST -Headers $headers -Body $samplePayload -UseBasicParsing
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Lead webhook PASSED!" -ForegroundColor Green
        Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Gray
        Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️ Unexpected status code: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host "`n🎯 Tests Complete!" -ForegroundColor Cyan
Write-Host "Check your database for new lead with source='Meta'" -ForegroundColor Yellow
Write-Host "Run polling to fetch full data:" -ForegroundColor Yellow
Write-Host "  curl http://localhost:3000/api/cron/sync-meta-leads -H `"Authorization: Bearer your-cron-secret`"" -ForegroundColor Gray
