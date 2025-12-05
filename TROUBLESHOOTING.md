# Meta Webhook Quick Troubleshooting Guide

## 🚨 Common Issues & Quick Fixes

### 1. Webhook Not Triggering

**Symptoms:**
- Leads submitted via Meta form
- No lead appears in dashboard
- No webhook logs in Vercel

**Quick Checks:**
```bash
# Check webhook subscription in Meta
# Go to: https://developers.facebook.com/apps → Your App → Webhooks

# Verify:
☐ Webhook is subscribed to "leadgen" field
☐ Callback URL matches: https://your-domain.vercel.app/api/webhooks/meta-leads
☐ Verify token matches META_WEBHOOK_VERIFY_TOKEN in .env
☐ App is in "Live" mode (not Development)
```

**Fix:**
1. Resubscribe webhook in Meta Developer Console
2. Use correct verify token from `.env`
3. Test with webhook tester: https://developers.facebook.com/tools/webhooks/

---

### 2. Campaign Name is NULL

**Symptoms:**
- Lead created successfully
- `campaign` field is NULL or just shows campaign ID
- No `campaignName` in metadata

**Quick Check:**
```powershell
# Test diagnostic endpoint
Invoke-WebRequest -Uri "https://your-domain.vercel.app/api/meta-diagnostic" | Select-Object -ExpandProperty Content
```

**Common Causes:**
| Issue | Fix |
|-------|-----|
| Missing `ads_read` permission | Add in Meta App Review → Permissions |
| Token doesn't have ad account access | Regenerate token with correct ad account |
| Campaign ID format wrong | Check logs for exact error from Meta API |

**Fix:**
1. Go to Meta App Dashboard
2. App Review → Permissions and Features
3. Request: `ads_management` or `ads_read`
4. Regenerate access token
5. Update `META_ACCESS_TOKEN` in Vercel environment variables
6. Redeploy

---

### 3. Token Expired / Invalid

**Symptoms:**
```
❌ Meta API Error (190): Invalid OAuth access token
```

**Quick Fix:**
```powershell
# Check token status
curl https://your-domain.vercel.app/api/meta-diagnostic

# If expired, generate new token:
# 1. Go to: https://developers.facebook.com/tools/explorer/
# 2. Select your app
# 3. Generate Access Token
# 4. Click "Exchange Token" for long-lived token
# 5. Copy token
# 6. Update in Vercel: Settings → Environment Variables → META_ACCESS_TOKEN
# 7. Redeploy
```

---

### 4. Missing Fields in Payload

**Symptoms:**
- `ad_id`, `adset_id`, or `campaign_id` is undefined
- Metadata shows NULL for these fields

**Why This Happens:**
Meta doesn't always include these IDs in the webhook payload. The enhanced implementation handles this:

1. **First:** Tries to get IDs from webhook payload
2. **Then:** Fetches complete lead data from Graph API (includes all IDs)
3. **Finally:** Uses whichever source has the data

**Check Logs For:**
```
🔍 Fetching complete lead data from Meta API...
✅ Lead data received: { ad_id: '123', adset_id: '456', campaign_id: '789' }
```

**If Still Missing:**
- Check Meta API response in logs
- Verify `leads_retrieval` permission
- Ensure token has access to the ad account

---

### 5. Signature Verification Failed

**Symptoms:**
```
❌ Invalid webhook signature
```

**Quick Fix:**
```powershell
# Verify META_APP_SECRET matches Meta app secret
# 1. Go to: https://developers.facebook.com/apps → Your App → Settings → Basic
# 2. Copy App Secret
# 3. Update in Vercel: META_APP_SECRET
# 4. Redeploy
```

**Note:** Signature verification is optional for testing but required for production.

---

### 6. Retry Logic Not Working

**Symptoms:**
- Webhook fails on temporary Meta API errors
- No retry attempts in logs

**Check Logs For:**
```
⚠️ Retrying request (attempt 1/3) after 1000ms...
⚠️ Retrying request (attempt 2/3) after 2000ms...
```

**If No Retries:**
- Error might not be retryable (e.g., 403 permission error)
- Check error code in logs
- Retryable codes: 1, 2, 4, 17, 32, 613

---

### 7. Duplicate Leads Created

**Symptoms:**
- Same lead appears multiple times in dashboard
- Same phone number, different Meta Lead IDs

**Expected Behavior:**
The enhanced implementation **prevents** duplicates by:
1. Checking Meta Lead ID in metadata
2. Checking phone number for Meta leads

**If Duplicates Still Occur:**
```sql
-- Check database for duplicates
SELECT phone, COUNT(*) as count 
FROM Lead 
WHERE source = 'meta' 
GROUP BY phone 
HAVING count > 1;
```

**Fix:**
- Ensure `checkDuplicateLead()` is being called (check logs)
- Verify metadata is stored as JSON (not string)

---

### 8. Performance Issues (Slow Webhook)

**Symptoms:**
- Webhook takes > 10 seconds
- Meta shows delivery failures due to timeout

**Quick Check:**
```
Look for: ✅ WEBHOOK PROCESSING COMPLETED (XXXms)
Target: < 5000ms
```

**Common Causes:**
| Issue | Duration | Fix |
|-------|----------|-----|
| Database slow | +2000ms | Optimize MySQL connection pool |
| Meta API slow | +3000ms | Already has retry logic, check Meta status |
| Multiple retries | +6000ms | Normal if Meta API is having issues |

**Optimization:**
The enhanced implementation already:
- ✅ Fetches campaign/adset/ad names in **parallel** (not sequential)
- ✅ Uses connection pooling
- ✅ Returns 200 immediately (processes async)

---

## 🔧 Quick Diagnostic Commands

### Check Environment Variables
```powershell
# Local
Get-Content .env | Select-String "META_"

# Vercel
vercel env pull
```

### Test Webhook Locally
```powershell
# Start dev server
npm run dev

# In another terminal, send test webhook
$body = @{
  object = "page"
  entry = @(@{
    changes = @(@{
      field = "leadgen"
      value = @{
        leadgen_id = "test_123"
        form_id = "456"
        page_id = $env:META_PAGE_ID
        created_time = "1234567890"
      }
    })
  })
} | ConvertTo-Json -Depth 10

Invoke-WebRequest -Uri "http://localhost:3000/api/webhooks/meta-leads" -Method POST -Body $body -ContentType "application/json"
```

### Check Token Expiry
```powershell
Invoke-WebRequest -Uri "https://your-domain.vercel.app/api/meta-diagnostic" | Select-Object -ExpandProperty Content | ConvertFrom-Json | Select-Object -ExpandProperty token
```

### View Recent Leads
```sql
SELECT 
  id,
  name,
  phone,
  campaign,
  JSON_EXTRACT(metadata, '$.campaignName') as campaignName,
  JSON_EXTRACT(metadata, '$.metaLeadId') as metaLeadId,
  createdAt
FROM Lead
WHERE source = 'meta'
ORDER BY createdAt DESC
LIMIT 10;
```

---

## 📊 Health Check Checklist

Before going live, verify:

- [ ] ✅ Diagnostic endpoint returns `status: "healthy"`
- [ ] ✅ Token expires in > 30 days
- [ ] ✅ All required scopes present
- [ ] ✅ Webhook subscription active in Meta
- [ ] ✅ App is in "Live" mode
- [ ] ✅ Test lead creates successfully
- [ ] ✅ Campaign/adset/ad names populated
- [ ] ✅ Webhook responds in < 5 seconds
- [ ] ✅ Logs show no errors
- [ ] ✅ Lead assigned to Gomathi

---

## 🆘 Emergency Rollback

If something goes critically wrong:

```powershell
# Rollback to old webhook
.\deploy-webhook.ps1 -Rollback

# Or manually:
Copy-Item "src\app\api\webhooks\meta-leads\route.ts.backup" "src\app\api\webhooks\meta-leads\route.ts" -Force

# Commit and push
git add .
git commit -m "Emergency rollback of webhook"
git push
```

---

## 📞 Getting Help

1. **Check Diagnostic:** https://your-domain.vercel.app/api/meta-diagnostic
2. **Check Vercel Logs:** Vercel Dashboard → Functions → `/api/webhooks/meta-leads`
3. **Check Meta Webhooks:** https://developers.facebook.com/apps → Webhooks → Recent Deliveries
4. **Review This Guide:** `META_WEBHOOK_FIX.md`

---

**Last Updated:** 2025-01-05  
**Version:** 2.0.0
