# 🔧 Meta Webhook Not Receiving Leads - Fix Guide

## Issue Diagnosed ✅
Your database shows 12 leads today, but they're all **manual entries** (not from Meta webhook).
The Meta webhook is NOT sending real-time data to your app.

## Root Cause
Meta webhook is either:
1. Not subscribed to your production app
2. Pointing to wrong URL (localhost instead of production)
3. Not configured to send leadgen events

## Fix Steps

### Step 1: Verify Webhook Subscription in Meta
1. Go to **Meta Business Manager** → **Business Settings**
2. Navigate to **Data Sources** → **Lead Forms**
3. Click on your lead form
4. Check **Webhook** settings

### Step 2: Subscribe Webhook to Correct URL
1. In Meta Developers Console: https://developers.facebook.com/apps/847836698417663
2. Go to **Webhooks** section
3. Click **Edit Subscription** for your Page
4. Ensure you're subscribed to: **`leadgen`** event
5. Verify Callback URL is: **`https://e2-w-lmp.vercel.app/api/webhooks/meta-leads`**
6. Verify Token matches: **`E2W_LMP_META_WEBHOOK_2025`**

### Step 3: Test Webhook Endpoint
Run this command to verify your endpoint is working:

```powershell
# Test webhook verification
$url = "https://e2-w-lmp.vercel.app/api/webhooks/meta-leads?hub.mode=subscribe&hub.verify_token=E2W_LMP_META_WEBHOOK_2025&hub.challenge=test123"
Invoke-WebRequest -Uri $url
```

Should return: `test123`

### Step 4: Test Full Webhook Flow
```powershell
# Test POST webhook
$body = @{
    object = "page"
    entry = @(
        @{
            id = "1552034478376801"
            time = [long][double]::Parse((Get-Date -UFormat %s))
            changes = @(
                @{
                    value = @{
                        leadgen_id = "test_$(Get-Date -Format 'yyyyMMddHHmmss')"
                        page_id = "1552034478376801"
                        form_id = "test_form"
                        adgroup_id = "test_adset"
                        ad_id = "test_ad"
                        created_time = [long][double]::Parse((Get-Date -UFormat %s))
                    }
                    field = "leadgen"
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

Invoke-WebRequest -Uri "https://e2-w-lmp.vercel.app/api/webhooks/meta-leads" `
    -Method POST `
    -Body $body `
    -ContentType "application/json" `
    -Headers @{
        "x-hub-signature-256" = "sha256=test"
    }
```

### Step 5: Check Webhook Status
Visit: https://e2-w-lmp.vercel.app/api/webhook-status

This will show:
- ✅ Environment variables configured
- ✅ Webhook URL
- Current status

### Step 6: Monitor Real-Time Logs
If you have Vercel CLI installed:
```powershell
vercel logs --follow
```

Or check logs in Vercel Dashboard:
https://vercel.com/your-team/e2-w-lmp/logs

### Step 7: Re-subscribe in Meta (If needed)

If webhook is not showing or not working:

1. **Unsubscribe** existing webhook (if any)
2. Click **Subscribe to Events**
3. Select **Page** → choose your page (ID: 1552034478376801)
4. Subscribe to **`leadgen`** event
5. Click **Save**

### Step 8: Test with Real Form Submission

1. Go to your Meta lead form
2. Submit a test lead
3. Check: https://e2-w-lmp.vercel.app/dashboard/leads
4. New lead should appear within seconds

## Quick Diagnostic Commands

```powershell
# Check database for today's webhook leads
cd c:\xampp\htdocs\E2W_LMP
node analyze-leads.js

# Expected output: "Real Webhook Leads: [number > 0]"
```

## Common Issues

### Issue: Webhook returns 403 Forbidden
**Fix:** Check `META_APP_SECRET` in Vercel environment variables

### Issue: Webhook returns 500 Error  
**Fix:** Check Vercel logs for detailed error message

### Issue: Leads show as "manual_*"
**Fix:** These are from backfill script, not real-time webhook. Need to subscribe webhook.

### Issue: "Token mismatch" error
**Fix:** Ensure `META_WEBHOOK_VERIFY_TOKEN` in Vercel matches Meta settings

## Important URLs

- **Production App:** https://e2-w-lmp.vercel.app
- **Webhook Endpoint:** https://e2-w-lmp.vercel.app/api/webhooks/meta-leads
- **Webhook Status:** https://e2-w-lmp.vercel.app/api/webhook-status
- **Leads Dashboard:** https://e2-w-lmp.vercel.app/dashboard/leads
- **Meta App:** https://developers.facebook.com/apps/847836698417663

## Environment Check

Verify these are set in **Vercel** (not just local .env):

```
META_APP_ID=847836698417663
META_APP_SECRET=d027d066c388978723bb4e378c93f576
META_ACCESS_TOKEN=EAAWnNnjnCxIBQOD8CHKD34TxdqDXY0meVqoH5i5wIjGiQZCgKMCQlZAF5SwAbNPPbCST8TkCtsQ8cS1LSbMit2KF6P51Eh1ijzG6TvnWrAotIpFIHZCySkZC7bnU9SyiaZCUUmDWjot3IjqkhLMHZBwh4LVrfn5rgiVHykTOKu6kq1OVxZCP4u8UqWtHVE8lajpPdVE3yYt
META_PAGE_ID=1552034478376801
META_WEBHOOK_VERIFY_TOKEN=E2W_LMP_META_WEBHOOK_2025
NEXT_PUBLIC_APP_URL=https://e2-w-lmp.vercel.app
```

⚠️ **CRITICAL:** `NEXT_PUBLIC_APP_URL` must be production URL in Vercel, NOT localhost!

## After Fix

Once webhook is properly subscribed, new leads from Meta ads will:
1. Automatically appear in your dashboard within seconds
2. Have real Meta Lead IDs (not "manual_*")
3. Include complete form field data
4. Trigger any configured notifications

---

**Need help?** Check Vercel logs or run diagnostic commands above.
