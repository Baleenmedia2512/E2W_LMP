# Meta Webhooks Integration - Fix & Enhancement Guide

## 🔧 What Was Fixed

Your Meta webhook integration has been completely rewritten to address all the issues you mentioned:

### ✅ Issues Resolved

1. **✅ Webhook Triggering Consistency**
   - Enhanced error handling to prevent webhook failures
   - Added comprehensive logging for debugging
   - Improved signature validation
   - Better handling of malformed requests

2. **✅ Missing Fields (campaign_name, adset_name, ad_name)**
   - Now fetching **complete** lead data with all IDs: `ad_id`, `adset_id`, `campaign_id`, `form_id`
   - Added parallel API calls to fetch campaign, adset, and ad **names** (not just IDs)
   - All names stored in metadata for future reference

3. **✅ Incomplete Lead Data**
   - Changed API call from basic fields to comprehensive:
     - Before: `?fields=id,created_time,field_data`
     - After: `?fields=id,created_time,ad_id,adset_id,campaign_id,form_id,field_data`
   - All field data properly parsed and stored

4. **✅ Verification Works but Delivery Fails**
   - Added detailed logging for every step
   - Improved error handling to identify exact failure points
   - Returns 200 even on errors to prevent Meta retry storms
   - Comprehensive diagnostic endpoint to check configuration

5. **✅ API Call Issues**
   - Added **retry logic** with exponential backoff for all Meta API calls
   - Handles rate limiting (error codes 4, 17, 32, 613)
   - Handles temporary errors (error codes 1, 2)
   - Retries up to 3 times with increasing delays (1s, 2s, 4s)

6. **✅ Error Logging**
   - Complete request/response logging
   - Meta API error codes and trace IDs logged
   - Network errors logged with stack traces
   - Performance metrics (duration) logged
   - Structured logging for easy debugging

7. **✅ Token Validation**
   - New utility function `validateAccessToken()` 
   - Checks token validity, expiry date, and scopes
   - Diagnostic endpoint at `/api/meta-diagnostic`
   - Warns when token expires within 7 days

8. **✅ Permission Validation**
   - Diagnostic checks for all required scopes:
     - `leads_retrieval`
     - `pages_read_engagement`
     - `pages_manage_metadata`
     - `pages_show_list`
     - `ads_management`
     - `ads_read`

## 📁 New Files Created

```
src/
  shared/lib/meta/
    api.ts                              # NEW: Meta Graph API utilities with retry logic
  app/api/
    webhooks/meta-leads/
      route.enhanced.ts                 # NEW: Enhanced webhook endpoint
    meta-diagnostic/
      route.ts                          # NEW: Diagnostic endpoint
META_WEBHOOK_FIX.md                    # THIS FILE
```

## 🚀 Deployment Steps

### Step 1: Backup Current Implementation

The current webhook is at: `src/app/api/webhooks/meta-leads/route.ts`

**It has been preserved.** The new implementation is in `route.enhanced.ts`

### Step 2: Test the New Implementation

Before deploying, you can test locally:

```powershell
# Start your development server
npm run dev

# In another terminal, test the diagnostic endpoint
Invoke-WebRequest -Uri "http://localhost:3000/api/meta-diagnostic" | Select-Object -ExpandProperty Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

This will show you:
- ✅ Environment variable status
- ✅ Token validity and expiry
- ✅ Current scopes vs required scopes
- ✅ Recommendations for fixes

### Step 3: Activate the Enhanced Webhook

When ready to deploy, replace the old webhook:

```powershell
# Backup the old version
Copy-Item "src\app\api\webhooks\meta-leads\route.ts" "src\app\api\webhooks\meta-leads\route.ts.backup"

# Activate the new version
Move-Item -Force "src\app\api\webhooks\meta-leads\route.enhanced.ts" "src\app\api\webhooks\meta-leads\route.ts"
```

### Step 4: Deploy to Production

```powershell
# Commit the changes
git add .
git commit -m "Enhanced Meta webhook integration with retry logic and complete data fetching"
git push

# Vercel will auto-deploy
```

### Step 5: Verify in Meta Developer Console

1. Go to: https://developers.facebook.com/apps
2. Select your app
3. Go to **Webhooks** section
4. Your webhook should show: `https://your-domain.vercel.app/api/webhooks/meta-leads`
5. Click **Test** to send a test event
6. Check the logs in Vercel dashboard

## 🧪 Testing Guide

### Test 1: Diagnostic Check

```bash
curl https://your-domain.vercel.app/api/meta-diagnostic
```

Expected output:
```json
{
  "status": "healthy",
  "token": {
    "valid": true,
    "expiresAt": "2025-03-15T10:30:00.000Z",
    "scopes": ["leads_retrieval", "ads_read", ...]
  },
  "recommendations": []
}
```

### Test 2: Webhook Verification (GET)

```bash
curl "https://your-domain.vercel.app/api/webhooks/meta-leads?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test123"
```

Expected: Returns `test123`

### Test 3: Webhook Delivery (POST)

Use the webhook test page:
https://your-domain.vercel.app/dashboard/webhook-test

Or send a manual POST:

```powershell
$body = @{
  object = "page"
  entry = @(
    @{
      id = "YOUR_PAGE_ID"
      time = [int][double]::Parse((Get-Date -UFormat %s))
      changes = @(
        @{
          field = "leadgen"
          value = @{
            leadgen_id = "test_lead_12345"
            form_id = "123456"
            page_id = "YOUR_PAGE_ID"
            ad_id = "987654"
            campaign_id = "456789"
            adgroup_id = "789012"
            created_time = [int][double]::Parse((Get-Date -UFormat %s))
          }
        }
      )
    }
  )
} | ConvertTo-Json -Depth 10

Invoke-WebRequest -Uri "https://your-domain.vercel.app/api/webhooks/meta-leads" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

### Test 4: Check Logs

After webhook triggers, check Vercel logs for:

```
📥 [2025-01-05T10:30:00.000Z] WEBHOOK POST RECEIVED
📥 [2025-01-05T10:30:00.001Z] Processing lead: test_lead_12345
🔍 [2025-01-05T10:30:00.002Z] Fetching complete lead data from Meta API...
✅ [2025-01-05T10:30:00.150Z] Lead data fetched successfully
🔍 [2025-01-05T10:30:00.151Z] Fetching campaign/adset/ad names...
✅ [2025-01-05T10:30:00.300Z] Campaign name: "Summer Sale 2025"
✅ [2025-01-05T10:30:00.301Z] Adset name: "Target Audience A"
✅ [2025-01-05T10:30:00.302Z] Ad name: "Creative Variant 1"
✅ [2025-01-05T10:30:00.350Z] Lead created successfully
```

## 🔍 What's New in the Enhanced Webhook

### 1. Complete Lead Data Fetching

**Old Code:**
```typescript
const leadResponse = await fetch(
  `https://graph.facebook.com/v21.0/${metaLeadId}?fields=id,created_time,field_data&access_token=${accessToken}`
);
```

**New Code:**
```typescript
// Uses shared utility from src/shared/lib/meta/api.ts
const leadData = await fetchLeadData(metaLeadId);
// Fetches: id,created_time,ad_id,adset_id,campaign_id,form_id,field_data
```

### 2. Campaign/Adset/Ad Name Resolution

**Old Code:** Only fetched campaign name (sometimes)

**New Code:**
```typescript
const { campaignName, adsetName, adName } = await fetchAllNames(
  campaignId,
  adsetId,
  adId
);
// Fetches all three names in PARALLEL for efficiency
```

### 3. Retry Logic

**Old Code:** Single attempt, fails if Meta API is temporarily down

**New Code:**
```typescript
async function fetchWithRetry<T>(url: string, options, retryCount = 0): Promise<T> {
  try {
    // ... attempt fetch ...
  } catch (error) {
    if (isRetryableError(error) && retryCount < 3) {
      await sleep(exponentialBackoff(retryCount));
      return fetchWithRetry(url, options, retryCount + 1);
    }
    throw error;
  }
}
```

### 4. Enhanced Metadata

**Old Metadata:**
```json
{
  "metaLeadId": "123",
  "formId": "456",
  "campaignId": "789"
}
```

**New Metadata:**
```json
{
  "metaLeadId": "123",
  "formId": "456",
  "adId": "321",
  "adsetId": "654",
  "campaignId": "789",
  "campaignName": "Summer Sale 2025",
  "adsetName": "Target Audience A",
  "adName": "Creative Variant 1",
  "submittedAt": "2025-01-05T10:30:00.000Z",
  "webhookReceived": "2025-01-05T10:30:01.000Z",
  "dataFetchedAt": "2025-01-05T10:30:02.000Z"
}
```

## 🐛 Troubleshooting

### Issue: "META_ACCESS_TOKEN not configured"

**Check:**
```powershell
# Verify environment variable
$env:META_ACCESS_TOKEN
```

**Fix:** Add to `.env` and Vercel environment variables

### Issue: "Token is invalid or expired"

**Check diagnostic:**
```bash
curl https://your-domain.vercel.app/api/meta-diagnostic
```

**Fix:**
1. Go to Meta Business Suite
2. Generate new long-lived token
3. Update in Vercel: Settings → Environment Variables → `META_ACCESS_TOKEN`
4. Redeploy

### Issue: "Missing required scopes"

**Current scopes shown in diagnostic, required scopes:**
- `leads_retrieval` ✅
- `pages_read_engagement` ✅
- `pages_manage_metadata` ✅
- `pages_show_list` ✅
- `ads_management` ✅
- `ads_read` ✅

**Fix:**
1. Go to Meta App Dashboard
2. App Review → Permissions and Features
3. Request missing permissions
4. Regenerate access token with new permissions

### Issue: "Campaign name is null"

**Possible causes:**
1. Insufficient permissions (`ads_read` scope missing)
2. Campaign ID format issue
3. Token doesn't have access to that ad account

**Check logs for:**
```
❌ Meta API Error: (#100) Requires business_management permission...
```

**Fix:** Add `business_management` or `ads_management` permission

### Issue: Webhook receives data but doesn't create lead

**Check Vercel function logs for:**
```
❌ Failed to process lead: <error message>
```

**Common causes:**
- Database connection issue
- Missing required field (phone)
- Duplicate lead detected (this is normal, check logs)

## 📊 Monitoring

### Key Metrics to Monitor

1. **Webhook Response Time**
   - Look for: `✅ WEBHOOK PROCESSING COMPLETED (XXXms)`
   - Target: < 5000ms
   - If slower: Check Meta API response times

2. **Success Rate**
   - Look for: `processed: X, failed: Y`
   - Target: 100% success
   - If failures: Check error logs for specific lead IDs

3. **Duplicate Detection**
   - Look for: `Duplicate detected by Meta Lead ID`
   - This is normal and expected
   - Indicates webhook is firing multiple times (Meta behavior)

4. **API Retries**
   - Look for: `⚠️ Retrying request (attempt X/3)`
   - Occasional retries are normal
   - Frequent retries indicate Meta API issues

### Recommended Alerts

Set up alerts in Vercel for:
1. Function errors > 5% of requests
2. Function duration > 10 seconds
3. 401/403 responses (token issues)

## 📚 API Reference

### New Utilities (src/shared/lib/meta/api.ts)

```typescript
// Validate access token
const tokenInfo = await validateAccessToken();
// Returns: { isValid, expiresAt, scopes, error }

// Fetch complete lead data
const leadData = await fetchLeadData(leadId);
// Returns: { id, created_time, ad_id, adset_id, campaign_id, form_id, field_data }

// Fetch campaign name
const name = await fetchCampaignName(campaignId);

// Fetch adset name
const name = await fetchAdsetName(adsetId);

// Fetch ad name
const name = await fetchAdName(adId);

// Fetch all names in parallel
const { campaignName, adsetName, adName } = await fetchAllNames(
  campaignId,
  adsetId,
  adId
);

// Parse lead fields
const { name, phone, email, customFields } = parseLeadFields(fieldData);
```

## 🎯 Next Steps

1. ✅ Test diagnostic endpoint: `/api/meta-diagnostic`
2. ✅ Review token expiry and scopes
3. ✅ Deploy enhanced webhook
4. ✅ Submit test lead from Meta form
5. ✅ Verify lead appears in dashboard with campaign/adset/ad names
6. ✅ Monitor logs for any errors
7. ✅ Set up alerts for webhook failures

## 📞 Support

If you encounter issues:

1. **Check diagnostic endpoint first**
   ```bash
   curl https://your-domain.vercel.app/api/meta-diagnostic
   ```

2. **Check Vercel function logs**
   - Go to Vercel Dashboard
   - Select deployment
   - Functions tab
   - Look for `/api/webhooks/meta-leads`

3. **Check webhook payload in Meta**
   - Meta Developers → Your App → Webhooks
   - Recent Deliveries section
   - Shows exact payload sent

## 🔄 Rollback Plan

If something goes wrong, rollback is simple:

```powershell
# Restore old webhook
Copy-Item "src\app\api\webhooks\meta-leads\route.ts.backup" "src\app\api\webhooks\meta-leads\route.ts" -Force

# Commit and push
git add .
git commit -m "Rollback to previous webhook version"
git push
```

---

**Created:** 2025-01-05  
**Version:** 2.0.0  
**Tested:** ✅ Local, ⏳ Production
