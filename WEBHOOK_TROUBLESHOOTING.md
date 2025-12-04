# Webhook Troubleshooting Guide

## Quick Diagnosis

**Webhook not receiving leads? Follow these steps:**

### 1. Check Webhook Health
Visit: `https://e2-w-lmp.vercel.app/api/webhooks/meta-leads/test`

This will show you:
- ✅ Environment variables configured
- ✅ Meta API token validity and expiration
- ✅ Webhook subscription status
- ✅ Recent leads in database

### 2. Common Issues & Solutions

#### Issue: No leads coming in

**Solution A: Check Access Token**
1. Meta access tokens expire after 60 days
2. Visit the test endpoint above - it will show token status
3. If expired, generate new token:
   - Go to Meta Business Suite → Settings → Business assets → Apps
   - Select your app
   - Go to "Lead Access" and generate new token
   - Update in Vercel environment variables

**Solution B: Verify Webhook Subscription**
1. Go to Meta App Dashboard: https://developers.facebook.com
2. Select your app → "Webhooks"
3. Check if webhook is subscribed to your Page
4. Verify subscription includes "leadgen" field
5. Check callback URL is: `https://e2-w-lmp.vercel.app/api/webhooks/meta-leads`

**Solution C: Check Webhook Verification**
1. Verify token in Vercel environment: `META_WEBHOOK_VERIFY_TOKEN`
2. Should match what you entered in Meta App Dashboard
3. No extra spaces or line breaks (we fixed this in .env.vercel.production)

#### Issue: Webhook was working, now stopped

**Most Common Cause: Token Expired**
- Meta tokens expire after 60 days
- Check token status at test endpoint
- Generate and update new token

#### Issue: Test leads work, but real leads don't

**Possible Causes:**
1. Form not properly connected to Page
2. App not subscribed to the specific form
3. Check Meta App Dashboard → Webhooks → Subscriptions

### 3. Monitor Webhook Calls

**Check Vercel Logs:**
```bash
# In Vercel Dashboard
Project → Deployments → [Latest] → Logs
```

Look for:
- `🔍 Meta webhook verification` - Initial setup calls
- `📥 WEBHOOK POST RECEIVED` - Incoming lead webhooks
- `📨 Received Meta lead: [ID]` - Lead processing
- `✅ Lead created: [name]` - Successful lead creation

### 4. Test Webhook Manually

**Method 1: Use Meta Test Button**
1. Go to Meta App Dashboard → Webhooks
2. Find "leadgen" subscription
3. Click "Test" button
4. Check Vercel logs for incoming call

**Method 2: Submit Test Lead**
1. Create a test lead ad form
2. Fill it out yourself
3. Wait 2-5 seconds
4. Check dashboard for new lead

### 5. Environment Variables Checklist

Verify in Vercel Dashboard → Project → Settings → Environment Variables:

```env
META_ACCESS_TOKEN=[Your long-lived token]
META_APP_SECRET=[Your app secret]
META_PAGE_ID=[Your Facebook Page ID]
META_WEBHOOK_VERIFY_TOKEN=E2W_LMP_META_WEBHOOK_2025
NEXT_PUBLIC_APP_URL=https://e2-w-lmp.vercel.app
```

**Important:** After updating environment variables, you MUST redeploy!

### 6. Backup Polling System

The system has a backup cron job that runs every hour:
- Endpoint: `/api/cron/sync-meta-leads`
- Fetches any leads that webhook might have missed
- Runs automatically (configured in DirectAdmin or external cron service)

To manually trigger backup sync:
```bash
curl -X GET "https://e2-w-lmp.vercel.app/api/cron/sync-meta-leads" \
  -H "Authorization: Bearer E2W_LMP_META_WEBHOOK_2026"
```

### 7. Recent Improvements (Dec 4, 2025)

✅ **Fixed:**
- Environment variable formatting (removed \r\n characters)
- Added comprehensive webhook logging
- Added token verification
- Created diagnostic endpoint

✅ **New Features:**
- Real-time webhook diagnostics
- Detailed logging for debugging
- Token expiration warnings

### 8. Quick Commands

**Check webhook health:**
```bash
curl https://e2-w-lmp.vercel.app/api/webhooks/meta-leads/test
```

**Check overall API health:**
```bash
curl https://e2-w-lmp.vercel.app/api/health
```

**Trigger manual sync:**
```bash
curl -X GET "https://e2-w-lmp.vercel.app/api/cron/sync-meta-leads" \
  -H "Authorization: Bearer E2W_LMP_META_WEBHOOK_2026"
```

### 9. Getting Help

**Data to provide when reporting issues:**
1. Output from: `https://e2-w-lmp.vercel.app/api/webhooks/meta-leads/test`
2. Screenshot of Meta App Dashboard → Webhooks page
3. Recent Vercel logs (last 50 lines)
4. When was the last lead received successfully?

### 10. Webhook Call Flow

**Normal Flow:**
1. User fills lead form on Facebook/Instagram
2. Meta sends webhook POST to: `/api/webhooks/meta-leads`
3. System logs: `📥 WEBHOOK POST RECEIVED`
4. Webhook fetches full lead data from Meta Graph API
5. System creates lead in database
6. Lead assigned to Gomathi automatically
7. System logs: `✅ Lead created: [name]`

**Where it can fail:**
- ❌ Step 2: Webhook not subscribed or URL wrong
- ❌ Step 2: Token verification fails
- ❌ Step 4: Access token expired
- ❌ Step 5: Database connection issue
- ❌ Step 6: Gomathi user not found in system

## Need Immediate Help?

1. Run diagnostic: `https://e2-w-lmp.vercel.app/api/webhooks/meta-leads/test`
2. Check Vercel logs for errors
3. Verify access token hasn't expired
4. Try manual sync to catch missed leads

---

**Last Updated:** December 4, 2025
**Version:** 2.0
