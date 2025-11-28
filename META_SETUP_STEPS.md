# Meta Lead Generation Integration - Setup Steps

## ✅ Completed
- [x] Webhook endpoint created at `/api/webhooks/meta-leads`
- [x] Webhook verified with Meta
- [x] Polling/sync endpoint created at `/api/cron/sync-meta-leads`
- [x] Cron job configured (runs every 30 minutes)

## 🔄 Required Steps

### Step 1: Get Long-Lived Page Access Token

1. **Get User Access Token:**
   - Go to https://developers.facebook.com/tools/explorer/
   - Select your app: **E2W_LMP**
   - Click "Get User Access Token"
   - Grant permissions:
     - `pages_manage_metadata`
     - `leads_retrieval`
     - `pages_read_engagement`
   - Copy the short-lived token

2. **Convert to Long-Lived User Token:**
   ```
   https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=SHORT_LIVED_TOKEN
   ```
   - Replace `YOUR_APP_ID`, `YOUR_APP_SECRET`, and `SHORT_LIVED_TOKEN`
   - Copy the `access_token` from response

3. **Get Page Access Token:**
   ```
   https://graph.facebook.com/v21.0/me/accounts?access_token=LONG_LIVED_USER_TOKEN
   ```
   - Find your page in the response
   - Copy the `access_token` (this is your long-lived page token)
   - Copy the `id` (this is your PAGE_ID)

### Step 2: Configure Vercel Environment Variables

Add these variables in Vercel Dashboard or via CLI:

**Via Vercel Dashboard:**
- Go to: https://vercel.com/baleen-medias-projects/e2-w-lmp/settings/environment-variables
- Add each variable for **Production**, **Preview**, and **Development**

**Required Variables:**
```env
META_APP_ID=your-app-id-from-meta-dashboard
META_APP_SECRET=your-app-secret-from-meta-dashboard
META_ACCESS_TOKEN=long-lived-page-access-token-from-step-1
META_PAGE_ID=page-id-from-step-1
META_WEBHOOK_VERIFY_TOKEN=E2W_LMP_META_WEBHOOK_2025
CRON_SECRET=generate-random-string-here
```

**Via CLI:**
```powershell
vercel env add META_APP_ID
vercel env add META_APP_SECRET
vercel env add META_ACCESS_TOKEN
vercel env add META_PAGE_ID
vercel env add META_WEBHOOK_VERIFY_TOKEN
vercel env add CRON_SECRET
```

### Step 3: Subscribe Webhook to Page Events

1. Go to Meta App Dashboard: https://developers.facebook.com/apps/YOUR_APP_ID/webhooks/
2. Find your **Page** subscription
3. Click **"Edit"** or **"Subscribe to Events"**
4. Check the box for: **`leadgen`**
5. Click **"Save"**

⚠️ **Important:** Without this subscription, Meta will NOT send leads to your webhook!

### Step 4: Create a Test Lead Form (If Not Already Created)

1. Go to Facebook Page Manager
2. Navigate to **Publishing Tools** → **Forms Library**
3. Create a new lead form with fields:
   - Full Name
   - Phone Number
   - Email (optional)
   - Custom question (optional)
4. Publish the form

### Step 5: Test the Integration

**Option A: Submit Test Lead**
1. Go to your Facebook Page
2. Click on the lead form ad/post
3. Submit a test lead
4. Check Vercel logs: https://vercel.com/baleen-medias-projects/e2-w-lmp/logs
5. Check your database for the new lead

**Option B: Use Test Webhook**
```powershell
# Run from project directory
.\test-meta-webhook.ps1
```

### Step 6: Verify Everything Works

**Check Webhook:**
```powershell
curl.exe "https://e2w-lmp.vercel.app/api/webhooks/meta-leads?hub.mode=subscribe&hub.verify_token=E2W_LMP_META_WEBHOOK_2025&hub.challenge=TEST"
```
Expected: Returns `TEST`

**Check Cron Job:**
```powershell
# Add CRON_SECRET to Vercel first, then:
curl.exe -H "Authorization: Bearer YOUR_CRON_SECRET" https://e2w-lmp.vercel.app/api/cron/sync-meta-leads
```

**Check Logs:**
- Webhook logs: https://vercel.com/baleen-medias-projects/e2-w-lmp/logs
- Filter by `/api/webhooks/meta-leads`

## 🔧 Troubleshooting

### Webhook not receiving leads?
1. Verify `leadgen` subscription is active in Meta dashboard
2. Check META_ACCESS_TOKEN is valid and not expired
3. Check Vercel logs for incoming requests
4. Verify PAGE_ID matches the page where form is published

### Leads missing data (showing PENDING)?
- The cron job will fetch full data within 30 minutes
- Or manually trigger: `/api/cron/sync-meta-leads`

### Duplicate leads?
- System automatically checks for duplicates by:
  - Meta Lead ID
  - Phone number
  - Email address

## 📊 How It Works

1. **User submits lead form** on Facebook
2. **Meta sends webhook** to `/api/webhooks/meta-leads` with lead ID
3. **System creates placeholder** lead with "PENDING" data
4. **Cron job runs every 30 min** to fetch full lead data from Graph API
5. **Lead is updated** with complete information
6. **Agent is assigned** via round-robin
7. **Activity logged** in database

## 🎯 Production URLs

- **Webhook:** https://e2w-lmp.vercel.app/api/webhooks/meta-leads
- **Cron Sync:** https://e2w-lmp.vercel.app/api/cron/sync-meta-leads
- **Dashboard:** https://e2w-lmp.vercel.app/dashboard/leads
