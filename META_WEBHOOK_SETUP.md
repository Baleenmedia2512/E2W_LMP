# 🚀 META WEBHOOK SETUP - COMPLETE GUIDE

## ⚡ QUICK FIX (Run This First!)

If your webhook is already configured but not receiving leads, run:

```bash
npm run fix:meta-webhook
```

This automated script will:
1. ✅ Verify all environment variables
2. ✅ Validate your access token
3. ✅ Subscribe your app to the page
4. ✅ Configure leadgen fields
5. ✅ Test your webhook endpoint

---

## 📋 STEP-BY-STEP SETUP

### Step 1: Set Environment Variables

**For Local Development (.env file):**

Create a `.env` file in the root directory:

```bash
# Required Meta Variables
META_ACCESS_TOKEN="your-long-lived-page-access-token"
META_APP_SECRET="your-facebook-app-secret"
META_WEBHOOK_VERIFY_TOKEN="E2W_LMP_META_WEBHOOK_2025"
META_PAGE_ID="your-facebook-page-id"
NEXT_PUBLIC_APP_URL="https://e2-w-lmp.vercel.app"

# Database (already configured)
DATABASE_URL="your-mysql-connection-string"
```

**For Production (Vercel):**

1. Go to: https://vercel.com/baleen-medias-projects/e2-w-lmp
2. Settings → Environment Variables
3. Add each variable above
4. Select: **Production** environment
5. Click **Save**
6. **Redeploy** your app

---

### Step 2: Get Your Meta Credentials

#### A. Get META_ACCESS_TOKEN (Page Access Token)

**Option 1: Facebook Business Manager (Recommended - Never Expires)**

1. Go to: https://business.facebook.com/settings/system-users
2. Create/Select a **System User**
3. Click **Generate New Token**
4. Select your **Page** (not user profile)
5. Select permissions:
   - ✅ `leads_retrieval`
   - ✅ `pages_show_list`
   - ✅ `pages_manage_metadata`
   - ✅ `pages_read_engagement`
6. Copy the **long-lived token**
7. Save as `META_ACCESS_TOKEN`

**Option 2: Graph API Explorer (60-day expiry)**

1. Go to: https://developers.facebook.com/tools/explorer
2. Select your **App**
3. Select your **Page** from dropdown
4. Click **Generate Access Token**
5. Grant all permissions
6. Click **Extend Access Token** (optional)
7. Copy and save

#### B. Get META_APP_SECRET

1. Go to: https://developers.facebook.com/apps/
2. Select your app
3. Settings → Basic
4. Click **Show** next to **App Secret**
5. Copy and save as `META_APP_SECRET`

#### C. Get META_PAGE_ID

**Method 1: From Facebook Page**
1. Go to your Facebook Page
2. Click **About**
3. Scroll to **Page ID**
4. Copy the number

**Method 2: From Graph API**
```bash
curl "https://graph.facebook.com/v21.0/me/accounts?access_token=YOUR_TOKEN"
```

#### D. Set META_WEBHOOK_VERIFY_TOKEN

Use this exact value (already set in your code):
```
E2W_LMP_META_WEBHOOK_2025
```

---

### Step 3: Run Automated Setup

Once all environment variables are set:

```bash
# Install dependencies (if not done)
npm install

# Run the automated setup
npm run setup:meta-webhook
```

This will:
- ✅ Verify environment variables
- ✅ Validate access token
- ✅ Subscribe app to page
- ✅ Configure webhook fields
- ✅ Test endpoint accessibility

**Expected Output:**
```
✅ All required environment variables are present
✅ Access token is valid
✅ Successfully subscribed app to page with leadgen fields
✅ Webhook endpoint responds correctly to verification
🎉 META WEBHOOK SETUP COMPLETE!
```

---

### Step 4: Configure Webhook in Meta Dashboard

Even though the script subscribes your app, you should verify in Meta Dashboard:

1. Go to: https://developers.facebook.com/apps/
2. Select your app
3. Products → **Webhooks**
4. Find **Page** webhooks
5. Click **Edit Subscription**
6. Enter:
   - **Callback URL:** `https://e2-w-lmp.vercel.app/api/webhooks/meta-leads`
   - **Verify Token:** `E2W_LMP_META_WEBHOOK_2025`
7. Click **Verify and Save**
8. Subscribe to fields:
   - ✅ `leadgen`
   - ✅ `leads_retrieval`
9. Click **Save**

---

### Step 5: Test Your Setup

#### A. Quick Health Check

```bash
npm run check:webhook
```

This shows:
- Environment variable status
- Access token validity
- Webhook subscription status
- Recent leads in database

#### B. Submit Test Lead

1. Create a Lead Ad form on Facebook
2. Submit a test entry
3. Check within 30 seconds

#### C. Verify Lead Arrival

**Check Vercel Logs:**
1. Go to: https://vercel.com/baleen-medias-projects/e2-w-lmp
2. Deployments → [Latest] → Runtime Logs
3. Search for: `WEBHOOK POST RECEIVED`
4. Should see lead processing logs

**Check Database:**
```bash
# Run in your database
SELECT * FROM Lead WHERE source = 'meta' ORDER BY createdAt DESC LIMIT 5;
```

**Check in App:**
1. Login to: https://e2-w-lmp.vercel.app/login
2. Navigate to Leads
3. Filter by source: Meta

---

## 🔧 TROUBLESHOOTING

### Issue: "Missing environment variables"

**Fix:**
```bash
# Copy example file
cp .env.example .env

# Edit .env and fill in all Meta values
# Then run setup again
npm run setup:meta-webhook
```

### Issue: "Access token is INVALID or EXPIRED"

**Fix:**
1. Generate new token from Business Manager
2. Update `META_ACCESS_TOKEN` in Vercel
3. Redeploy
4. Run: `npm run setup:meta-webhook`

### Issue: "Subscription failed"

**Common Causes:**
- Token missing `pages_manage_metadata` permission
- Not admin of the page
- App not approved for Lead Ads product

**Fix:**
1. Ensure you're page admin
2. Regenerate token with all permissions
3. Submit app for Lead Ads review (if required)

### Issue: "Webhook endpoint not reachable"

**Fix:**
1. Verify app is deployed: https://e2-w-lmp.vercel.app
2. Check NEXT_PUBLIC_APP_URL is correct
3. Ensure HTTPS (required by Meta)

### Issue: "Leads not appearing in database"

**Checks:**
```bash
# 1. Check if webhook is being called
npm run check:webhook

# 2. Check Vercel logs for errors
# Go to Vercel dashboard → Runtime Logs

# 3. Test endpoint manually
curl "https://e2-w-lmp.vercel.app/api/webhooks/meta-leads/test"
```

---

## 📊 MONITORING & MAINTENANCE

### Daily Checks

```bash
# Quick health check
npm run check:webhook
```

### Weekly Checks

1. Verify access token expiry:
   - Check output of `npm run check:webhook`
   - Renew if < 7 days remaining

2. Check Meta webhook delivery attempts:
   - Meta Dashboard → Webhooks → Recent Deliveries
   - Should show 200 OK responses

### Monthly Checks

1. Review lead data accuracy
2. Verify campaign names are populating
3. Check for any failed webhook calls

---

## 🆘 EMERGENCY FIXES

### If leads stop coming suddenly:

```bash
# Re-run complete setup
npm run fix:meta-webhook

# Check health
npm run check:webhook

# Verify in Meta Dashboard
# Webhooks → Test → Send Test Event
```

### If script fails:

**Manual subscription via cURL:**

```bash
curl -X POST "https://graph.facebook.com/v21.0/YOUR_PAGE_ID/subscribed_apps" \
  -d "subscribed_fields=leadgen,leads_retrieval" \
  -d "access_token=YOUR_PAGE_ACCESS_TOKEN"
```

### Access Vercel Logs Directly:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# View logs
vercel logs e2-w-lmp --follow
```

---

## 📞 SUPPORT ENDPOINTS

### Test Endpoints (Already Built-In)

1. **Health Check:**
   ```
   GET https://e2-w-lmp.vercel.app/api/webhooks/meta-leads/test
   ```

2. **Webhook Status:**
   ```
   GET https://e2-w-lmp.vercel.app/api/webhook-status
   ```

3. **Diagnostic:**
   ```
   GET https://e2-w-lmp.vercel.app/api/meta-diagnostic/route
   ```

4. **Manual Backfill (if needed):**
   ```
   GET https://e2-w-lmp.vercel.app/api/backfill-meta-leads
   ```

---

## ✅ VERIFICATION CHECKLIST

Before going live, verify:

- [ ] All environment variables set in Vercel
- [ ] Access token is valid and long-lived
- [ ] Token has all required permissions
- [ ] App subscribed to page
- [ ] Webhook configured in Meta Dashboard
- [ ] Leadgen field is subscribed
- [ ] Test endpoint returns healthy status
- [ ] Test lead submitted successfully
- [ ] Lead appears in database
- [ ] Lead assigned to correct user (Gomathi)
- [ ] Campaign names populating correctly
- [ ] Vercel logs show successful processing

---

## 🎯 SUCCESS CRITERIA

Your webhook is working correctly when:

1. ✅ `npm run check:webhook` shows all green checks
2. ✅ Test lead appears in database within 30 seconds
3. ✅ Vercel logs show "WEBHOOK POST RECEIVED"
4. ✅ Meta Dashboard shows successful deliveries (200 OK)
5. ✅ Leads have complete data (name, phone, campaign)

---

## 📚 ADDITIONAL RESOURCES

- **Meta Webhooks Guide:** https://developers.facebook.com/docs/graph-api/webhooks
- **Lead Ads API:** https://developers.facebook.com/docs/marketing-api/guides/lead-ads
- **Vercel Logs:** https://vercel.com/docs/observability/runtime-logs
- **Your Test Page:** https://e2-w-lmp.vercel.app/dashboard/webhook-test

---

## 🔄 QUICK COMMAND REFERENCE

```bash
# Setup webhook (first time)
npm run setup:meta-webhook

# Fix existing webhook
npm run fix:meta-webhook

# Check webhook health
npm run check:webhook

# View logs (requires Vercel CLI)
vercel logs e2-w-lmp --follow
```

---

**Last Updated:** December 10, 2025
**Version:** 1.0.0

Need help? Check Vercel logs or contact support.
