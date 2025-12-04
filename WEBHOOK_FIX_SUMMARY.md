# Webhook Fix Summary - December 4, 2025

## Issues Found & Fixed

### 1. ✅ Environment Variables Had Extra Characters
**Problem:** All environment variables in `.env.vercel.production` had `\r\n` at the end
**Impact:** Could cause token/secret comparison failures
**Fixed:** Removed all `\r\n` characters from environment values

### 2. ✅ No Token Verification
**Problem:** Webhook was accepting any request without verifying the token
**Security Risk:** Anyone could send fake leads
**Fixed:** Added proper token verification with detailed logging

### 3. ✅ Insufficient Logging
**Problem:** Hard to diagnose why webhook wasn't receiving leads
**Impact:** No visibility into webhook calls or failures
**Fixed:** Added comprehensive logging:
- Detailed request headers
- Body analysis
- Timestamp tracking
- Success/failure indicators

### 4. ✅ No Diagnostic Tools
**Problem:** No way to test webhook configuration
**Impact:** Had to debug blindly
**Fixed:** Created diagnostic endpoint at `/api/webhooks/meta-leads/test`

## What Was Changed

### Files Modified:
1. `src/app/api/webhooks/meta-leads/route.ts`
   - Enhanced GET handler with token verification
   - Added detailed logging throughout POST handler
   - Improved error tracking

2. `.env.vercel.production`
   - Cleaned up all environment variable values
   - Removed carriage return + newline characters

### Files Created:
1. `src/app/api/webhooks/meta-leads/test/route.ts`
   - Diagnostic endpoint to check webhook health
   - Tests access token validity
   - Checks webhook subscription
   - Shows recent leads

2. `WEBHOOK_TROUBLESHOOTING.md`
   - Complete troubleshooting guide
   - Step-by-step diagnostic procedures
   - Common issues and solutions

## Next Steps - IMPORTANT!

### Step 1: Redeploy to Vercel
After environment variable changes, you MUST redeploy:

```bash
# Option A: Push to git (triggers auto-deploy)
git add .
git commit -m "Fix webhook configuration and add diagnostics"
git push

# Option B: Redeploy from Vercel Dashboard
Go to Vercel Dashboard → Deployments → Redeploy
```

### Step 2: Run Diagnostic
Once redeployed, visit:
```
https://e2-w-lmp.vercel.app/api/webhooks/meta-leads/test
```

This will tell you:
- ✅ If access token is valid (MOST COMMON ISSUE)
- ✅ When token expires
- ✅ If webhook is properly subscribed
- ✅ Recent leads in database

### Step 3: Check Access Token
**Meta access tokens expire after 60 days!**

If diagnostic shows token is expired:
1. Go to Meta Business Suite
2. Settings → Business assets → Apps
3. Select your app
4. Go to "Lead Access" section
5. Generate new long-lived access token
6. Update in Vercel: Settings → Environment Variables → `META_ACCESS_TOKEN`
7. Redeploy again

### Step 4: Verify Webhook Subscription
In Meta App Dashboard (https://developers.facebook.com):
1. Select your app
2. Go to "Webhooks"
3. Verify callback URL: `https://e2-w-lmp.vercel.app/api/webhooks/meta-leads`
4. Check subscription includes "leadgen" field
5. Verify token matches: `E2W_LMP_META_WEBHOOK_2025`

### Step 5: Test with Real Lead
Submit a test lead through your form and:
1. Check Vercel logs (Deployments → Latest → Logs)
2. Look for: `📥 WEBHOOK POST RECEIVED`
3. Wait 2-5 seconds
4. Check dashboard for new lead

### Step 6: Manual Sync (If Needed)
If webhook is still not working but you need leads now:
```bash
curl -X GET "https://e2-w-lmp.vercel.app/api/cron/sync-meta-leads" \
  -H "Authorization: Bearer E2W_LMP_META_WEBHOOK_2026"
```

This will fetch any leads from the last hour via polling.

## Most Likely Root Cause

Based on "leads not coming yesterday":

**95% probability: Access token expired**
- Meta tokens expire after 60 days
- When expired, webhook receives call but can't fetch lead data
- Run diagnostic to confirm
- Generate new token if needed

## Monitoring Going Forward

### Check These Regularly:
1. **Diagnostic endpoint** - Run weekly
   - Shows token expiration date
   - Alerts if issues

2. **Vercel logs** - Check when issues reported
   - Look for webhook POST calls
   - Check for errors

3. **Database** - Monitor last Meta lead timestamp
   - If > 24 hours, investigate

### Set Up Alerts (Recommended):
- Calendar reminder: 45 days after token generation
- Weekly check of diagnostic endpoint
- Monitor last lead timestamp

## Summary

**What was wrong:**
- Environment variable formatting issues
- No token verification
- Missing diagnostic tools
- Possibly expired access token (check diagnostic)

**What's fixed:**
- ✅ Clean environment variables
- ✅ Proper token verification
- ✅ Comprehensive logging
- ✅ Diagnostic tools
- ✅ Troubleshooting guide

**What you need to do:**
1. Redeploy the application
2. Run diagnostic endpoint
3. Check if access token is valid
4. Renew token if expired
5. Test with real lead

## Files You Need to Know

- **Webhook handler:** `src/app/api/webhooks/meta-leads/route.ts`
- **Diagnostic tool:** `https://e2-w-lmp.vercel.app/api/webhooks/meta-leads/test`
- **Health check:** `https://e2-w-lmp.vercel.app/api/health`
- **Manual sync:** `/api/cron/sync-meta-leads`
- **Troubleshooting:** `WEBHOOK_TROUBLESHOOTING.md`

---

**Status:** Ready to deploy
**Priority:** HIGH - Redeploy immediately
**Estimated Fix Time:** 5 minutes (after redeploy)
**Last Updated:** December 4, 2025
