# 🎯 COMPLETE PROCEDURE: Creating Meta Lead Ads Webhook

## 📊 Overview

This guide provides **step-by-step instructions** to create and configure a Meta (Facebook) webhook that automatically captures leads from your Facebook/Instagram ad campaigns into your Lead Management Platform.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    META LEAD FLOW                           │
└─────────────────────────────────────────────────────────────┘

User Submits Form on Facebook Ad
        ↓
Meta sends webhook notification (only IDs)
        ↓
/api/webhooks/meta-leads (Your endpoint)
        ↓
Create placeholder lead (phone = "PENDING")
        ↓
/api/cron/sync-meta-leads (Polling - every 30 mins)
        ↓
Fetch full data from Meta Graph API
        ↓
Update lead with actual name, phone, email
        ↓
Auto-assign to agent via round-robin
        ↓
✅ Complete lead in your database
```

---

## 📝 PART 1: Facebook App Configuration

### 1.1 Create Facebook App

**Time Required:** 5 minutes

1. **Navigate to Facebook Developers**
   - URL: https://developers.facebook.com
   - Click **"My Apps"** in top right

2. **Create New App**
   - Click **"Create App"** button
   - Select app type: **"Business"**
   - Click **"Next"**

3. **Fill App Details**
   ```
   App Name: E2W Lead Management Platform
   App Contact Email: your-business-email@example.com
   Business Account: [Select your business account]
   ```
   - Click **"Create App"**

4. **Note Your App ID**
   - You'll see it in the dashboard header
   - Format: `123456789012345`
   - Save this for later

### 1.2 Add Required Products

**A. Add Webhooks Product**

1. In App Dashboard, click **"Add Product"** in left menu
2. Find **"Webhooks"**
3. Click **"Set Up"** button
4. This adds webhooks capability to your app

**B. Add Lead Ads Product**

1. Click **"Add Product"** again
2. Find **"Lead Ads"** (or search for it)
3. Click **"Set Up"** button
4. Follow the setup wizard:
   - Select your Facebook Page
   - Grant necessary permissions
   - Complete setup

### 1.3 Get App Secret

1. Navigate to **Settings** → **Basic** (left menu)
2. Find **"App Secret"** field
3. Click **"Show"** button
4. Enter your Facebook password to verify
5. **Copy the App Secret**
   - Format: `abcd1234ef5678gh9012ij3456kl7890`
6. **Save securely** - you'll add this to `.env` file

---

## 📝 PART 2: Local Development Setup

### 2.1 Install ngrok (For Testing Locally)

**Why?** Meta webhooks require a publicly accessible HTTPS URL. ngrok creates a secure tunnel from the internet to your localhost.

**Installation:**

**Option A: Chocolatey (Windows)**
```powershell
choco install ngrok
```

**Option B: Direct Download**
1. Download from: https://ngrok.com/download
2. Extract to a folder (e.g., `C:\ngrok`)
3. Add to PATH or run from that folder

**Option C: npm**
```powershell
npm install -g ngrok
```

### 2.2 Start Your Application

Open PowerShell/Terminal 1:
```powershell
cd c:\xampp\htdocs\E2W_LMP
npm run dev
```

Verify it's running at: http://localhost:3000

### 2.3 Start ngrok Tunnel

Open PowerShell/Terminal 2:
```powershell
ngrok http 3000
```

**Expected Output:**
```
ngrok

Session Status    online
Account           Free User
Version           3.x.x
Region            United States (us)
Latency           -
Web Interface     http://127.0.0.1:4040
Forwarding        https://abc123.ngrok.io -> http://localhost:3000

Connections       ttl     opn     rt1
                  0       0       0.00
```

**Copy the HTTPS Forwarding URL:**
```
https://abc123.ngrok.io
```

⚠️ **Important Notes:**
- Keep ngrok running while testing
- Each time you restart ngrok, URL changes (unless you have paid plan)
- Free tier URL expires after ~2 hours of inactivity

### 2.4 Configure Environment Variables

1. **Create `.env` file** (if not exists):
```powershell
Copy-Item .env.example .env
```

2. **Open `.env` in editor** and add these values:

```env
# Database (Already configured)
DATABASE_URL="mysql://root:@localhost:3306/e2w_lms"

# Meta Lead Ads Integration
META_APP_SECRET="YOUR_APP_SECRET_FROM_STEP_1.3"
META_WEBHOOK_VERIFY_TOKEN="E2W_LMP_META_WEBHOOK_2025"
META_ACCESS_TOKEN="WILL_ADD_IN_STEP_3.2"
META_PAGE_ID="WILL_ADD_IN_STEP_3.3"

# Cron Secret (for polling endpoint)
CRON_SECRET="your-secret-key-change-in-production"
```

3. **Save the file**

4. **Restart your Next.js app** (Ctrl+C then `npm run dev`)

---

## 📝 PART 3: Page Access Token & Page ID

### 3.1 Understanding Permissions

Your app needs these permissions to fetch lead data:
- ✅ `leads_retrieval` - Access lead information
- ✅ `pages_read_engagement` - Read page activity
- ✅ `pages_manage_ads` - Access ad-related data

### 3.2 Generate Page Access Token

**Method 1: Access Token Tool (Quick for Testing)**

1. Go to: https://developers.facebook.com/tools/accesstoken
2. Find your Facebook Page in the list
3. Click **"Page Access Token"** column
4. Copy the token (starts with `EAAA...`)
5. Paste in `.env` as `META_ACCESS_TOKEN`

⚠️ **Note:** This token may expire. For production, use Method 2.

**Method 2: Business Manager (Recommended for Production)**

1. Go to: https://business.facebook.com/settings
2. Click **"Users"** → **"System Users"**
3. Click **"Add"** to create system user
   - Name: `E2W LMP Integration`
   - Role: Admin
4. Click the system user name
5. Click **"Generate New Token"**
6. Select your app
7. Select your page
8. Choose permissions:
   - ✅ `leads_retrieval`
   - ✅ `pages_read_engagement`
   - ✅ `pages_manage_ads`
9. Click **"Generate Token"**
10. **Copy the token**
11. Paste in `.env` as `META_ACCESS_TOKEN`

**To make token long-lived (never expires):**

Use Graph API Explorer:
1. Go to: https://developers.facebook.com/tools/explorer/
2. Paste this in the query field:
```
/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=YOUR_SHORT_LIVED_TOKEN
```
3. Click **Submit**
4. Copy the new `access_token` from response
5. Update `.env` with new token

### 3.3 Get Your Page ID

**Method 1: From Page About Section**
1. Go to your Facebook Page
2. Click **"About"** tab
3. Scroll down to **"Page Transparency"**
4. Find **"Page ID"**
5. Copy the number (e.g., `123456789012345`)

**Method 2: From Page URL**
- If your page URL is: `facebook.com/YourPageName-123456789`
- The Page ID is: `123456789`

**Add to `.env`:**
```env
META_PAGE_ID="123456789012345"
```

---

## 📝 PART 4: Webhook Configuration

### 4.1 Configure Webhook in Facebook App

1. **Go to your App Dashboard**
   - https://developers.facebook.com/apps/YOUR_APP_ID

2. **Navigate to Webhooks**
   - Left menu → **Products** → **Webhooks**

3. **Select Page Object**
   - Click dropdown or find **"Page"** section
   - Click **"Edit Subscription"** or **"Configure Webhooks"**

### 4.2 Enter Webhook Details

**Callback URL:**
```
https://YOUR-NGROK-URL.ngrok.io/api/webhooks/meta-leads
```
Example: `https://abc123.ngrok.io/api/webhooks/meta-leads`

**Verify Token:**
```
E2W_LMP_META_WEBHOOK_2025
```
(Must match `META_WEBHOOK_VERIFY_TOKEN` in your `.env`)

**Click "Verify and Save"**

✅ If successful, you'll see **"Complete"** status with green checkmark

❌ If failed, check:
- ngrok is running
- Your app is running on localhost:3000
- URL is correct (no trailing slash)
- Verify token matches exactly

### 4.3 Subscribe to leadgen Events

1. In same Webhooks section, find **"Subscription Fields"**
2. Check ✅ **"leadgen"** checkbox
3. Click **"Save"**

### 4.4 Subscribe Your Page to Webhook

1. Scroll down to **"Page"** section in Webhooks
2. Click **"Subscribe to this object"** (or **"Add Subscriptions"**)
3. Search for your Facebook Page
4. Select your page
5. Click **"Subscribe"**
6. Verify **"leadgen"** is checked
7. Click **"Done"**

**Verify subscription:**
- You should see your page listed
- Status: **"Active"**
- Fields: **"leadgen"** ✅

---

## 📝 PART 5: Testing

### 5.1 Test Webhook Verification (GET)

**Manual browser test:**
```
http://localhost:3000/api/webhooks/meta-leads?hub.mode=subscribe&hub.verify_token=E2W_LMP_META_WEBHOOK_2025&hub.challenge=test123
```

**Expected result:** Browser displays `test123`

**Using PowerShell:**
```powershell
curl "http://localhost:3000/api/webhooks/meta-leads?hub.mode=subscribe&hub.verify_token=E2W_LMP_META_WEBHOOK_2025&hub.challenge=test123"
```

### 5.2 Test with Sample Lead Data (POST)

Use the provided test script:

```powershell
# Set your app secret
$env:META_APP_SECRET="your-app-secret-here"

# Run test
.\test-meta-webhook.ps1
```

**Expected console output:**
```
✅ Webhook verification PASSED!
✅ Lead webhook PASSED!
```

**Check your application logs:**
```
📨 Received Meta lead: test-lead-20251128120000
✅ Lead placeholder created: cm123abc456
```

### 5.3 Test with Real Lead Ad

1. **Create or find a Lead Ad** on your Facebook Page
2. **Submit a test lead**:
   - Open ad in preview/testing mode
   - Fill out the form
   - Submit

3. **Check your application console** for:
```
📨 Received Meta lead: 987654321
✅ Lead placeholder created: cm789xyz123
```

4. **Check database:**
```sql
SELECT * FROM Lead WHERE source = 'Meta' ORDER BY createdAt DESC LIMIT 5;
```

You should see new lead with `phone = "PENDING"`

### 5.4 Test Polling (Fetch Full Data)

Run the polling endpoint to fetch complete lead information:

```powershell
curl http://localhost:3000/api/cron/sync-meta-leads -H "Authorization: Bearer your-secret-key-change-in-production"
```

**Expected response:**
```json
{
  "success": true,
  "updatedPlaceholders": 1,
  "newLeads": 0,
  "message": "Sync completed successfully"
}
```

**Check database again:**
```sql
SELECT name, phone, email, source FROM Lead WHERE source = 'Meta' ORDER BY createdAt DESC LIMIT 5;
```

Lead should now have real name, phone, and email!

---

## 📝 PART 6: Production Deployment

### 6.1 Deploy to Production Server

**Option A: Vercel (Recommended)**

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel Dashboard:
   ```
   META_APP_SECRET
   META_WEBHOOK_VERIFY_TOKEN
   META_ACCESS_TOKEN
   META_PAGE_ID
   CRON_SECRET
   ```
4. Deploy

**Option B: Other Hosting**
- Ensure HTTPS is enabled
- Set all environment variables
- Deploy application

### 6.2 Update Webhook URL in Meta

1. Go back to Facebook App Dashboard
2. Navigate to **Webhooks** → **Page** → **Edit Subscription**
3. Update **Callback URL**:
```
https://your-production-domain.com/api/webhooks/meta-leads
```
4. Click **"Verify and Save"**

### 6.3 Setup Automated Polling

**For Vercel:**

Create `vercel.json` in project root:
```json
{
  "crons": [{
    "path": "/api/cron/sync-meta-leads",
    "schedule": "*/30 * * * *"
  }]
}
```

This runs polling every 30 minutes automatically.

**For other platforms:**

Setup cron job or scheduler to call:
```
GET https://your-domain.com/api/cron/sync-meta-leads
Authorization: Bearer YOUR_CRON_SECRET
```

Schedule: Every 15-30 minutes

---

## 🎯 Final Verification Checklist

Before marking as complete, verify:

- [ ] Facebook App created with correct name
- [ ] Webhooks product added to app
- [ ] Lead Ads product added to app
- [ ] App Secret copied and stored in `.env`
- [ ] Page Access Token generated with correct permissions
- [ ] Page ID identified and stored in `.env`
- [ ] Webhook callback URL configured in Meta dashboard
- [ ] Verify token matches between Meta and `.env`
- [ ] "leadgen" subscription field enabled
- [ ] Facebook Page subscribed to webhook
- [ ] Webhook verification test passes (GET request)
- [ ] Sample lead test passes (POST request)
- [ ] Real lead ad submission creates database entry
- [ ] Polling endpoint updates placeholder leads
- [ ] Production deployment complete (if applicable)
- [ ] Production webhook URL updated in Meta
- [ ] Automated polling configured

---

## 🎉 Success!

Your Meta Lead Ads webhook is now fully configured and operational!

**What happens next:**

1. User submits lead form on Facebook/Instagram ad
2. Meta sends webhook notification instantly
3. Placeholder lead created in your database
4. Polling runs every 30 minutes to fetch full data
5. Lead automatically assigned to agent
6. Agent receives notification and can start calling

---

## 📞 Need Help?

If you encounter issues:

1. Check **Console Logs** - errors are detailed
2. Review **META_INTEGRATION_GUIDE.md** for troubleshooting
3. Use **test-meta-webhook.ps1** to debug locally
4. Verify all environment variables are set correctly
5. Check Meta's Webhook Testing Tool in App Dashboard

---

**Document Version:** 1.0  
**Last Updated:** November 28, 2025  
**Author:** E2W Development Team
