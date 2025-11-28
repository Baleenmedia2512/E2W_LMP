# 🚀 Meta Lead Ads Integration - Complete Setup Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Facebook App Setup](#facebook-app-setup)
3. [Local Development Setup (ngrok)](#local-development-setup)
4. [Webhook Configuration](#webhook-configuration)
5. [Environment Variables](#environment-variables)
6. [Testing](#testing)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

---

## 1️⃣ Prerequisites

Before starting, ensure you have:
- ✅ Facebook Business Account
- ✅ Facebook Page for your business
- ✅ Lead Ads campaigns running
- ✅ Admin access to Facebook App Dashboard
- ✅ This application running locally (`npm run dev`)

---

## 2️⃣ Facebook App Setup

### Step 1: Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com)
2. Click **"My Apps"** → **"Create App"**
3. Choose **"Business"** as app type
4. Fill in details:
   - **App Name**: `E2W Lead Management`
   - **Contact Email**: Your business email
   - **Business Account**: Select your business account
5. Click **"Create App"**

### Step 2: Add Required Products

In your App Dashboard, add these products:

#### A. Webhooks
1. Click **"Add Product"**
2. Find **"Webhooks"** → Click **"Set Up"**
3. Keep this tab open (you'll configure it later)

#### B. Lead Ads
1. Click **"Add Product"**
2. Find **"Lead Ads"** → Click **"Set Up"**
3. Complete setup wizard

### Step 3: Get Your App Secret

1. Go to **Settings** → **Basic**
2. Click **"Show"** next to **"App Secret"**
3. Copy the value
4. Save it (you'll need it for `.env` file)

---

## 3️⃣ Local Development Setup (ngrok)

Since Meta webhooks need a public URL, use ngrok to tunnel your localhost:

### Install ngrok

**Windows (PowerShell):**
```powershell
choco install ngrok
```

**Or download from:** https://ngrok.com/download

### Start ngrok Tunnel

1. Open a new terminal/PowerShell window
2. Run:
```powershell
ngrok http 3000
```

3. You'll see output like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)
5. **Keep ngrok running** while testing

⚠️ **Important**: Every time you restart ngrok, the URL changes. Update webhook URL in Meta accordingly.

---

## 4️⃣ Webhook Configuration

### Step 1: Configure Webhook in Facebook App

1. Go to your Facebook App Dashboard
2. Click **"Webhooks"** in left sidebar
3. Click **"Edit Subscription"** (or **"Configure Webhooks"**)
4. Select **"Page"** as object

### Step 2: Subscribe to Page Events

Fill in webhook details:

**Callback URL:**
```
https://abc123.ngrok.io/api/webhooks/meta-leads
```
(Replace `abc123.ngrok.io` with your actual ngrok URL)

**Verify Token:**
```
E2W_LMP_META_WEBHOOK_2025
```
(Or any custom token you set in `.env`)

**Subscription Fields:**
- ✅ Check **"leadgen"**

Click **"Verify and Save"**

✅ If successful, you'll see "Complete" status

### Step 3: Subscribe Your Page

1. In Webhooks section, scroll down to **"Page"**
2. Click **"Subscribe to this object"**
3. Search and select your Facebook Page
4. Click **"Subscribe"**
5. Ensure **"leadgen"** is checked

---

## 5️⃣ Environment Variables

### Step 1: Create `.env` File

Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

### Step 2: Configure Meta Variables

Open `.env` and fill in these values:

```env
# Meta Lead Ads Integration
META_APP_SECRET="YOUR_ACTUAL_APP_SECRET_FROM_FACEBOOK"
META_WEBHOOK_VERIFY_TOKEN="E2W_LMP_META_WEBHOOK_2025"
META_ACCESS_TOKEN="YOUR_PAGE_ACCESS_TOKEN"
META_PAGE_ID="YOUR_FACEBOOK_PAGE_ID"
NGROK_URL="https://abc123.ngrok.io"
```

### Step 3: Get Page Access Token

**Method 1: Facebook Business Manager (Recommended)**

1. Go to [Facebook Business Settings](https://business.facebook.com/settings)
2. Click **"System Users"** (under Users section)
3. Create or select a system user
4. Click **"Generate New Token"**
5. Select your app
6. Select your page
7. Choose permissions:
   - ✅ `leads_retrieval`
   - ✅ `pages_read_engagement`
   - ✅ `pages_manage_ads`
8. Click **"Generate Token"**
9. Copy the token (starts with `EAAA...`)
10. **Make it long-lived** using Graph API Explorer:
    - Go to https://developers.facebook.com/tools/explorer/
    - Use this endpoint:
    ```
    /oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=YOUR_SHORT_LIVED_TOKEN
    ```

**Method 2: Access Token Tool**

1. Go to [Facebook Access Token Tool](https://developers.facebook.com/tools/accesstoken)
2. Find your page
3. Copy the **Page Access Token**

### Step 4: Get Your Page ID

1. Go to your Facebook Page
2. Click **"About"**
3. Scroll down to find **Page ID**
4. Copy the number

---

## 6️⃣ Testing

### Step 1: Start Your Application

```powershell
npm run dev
```

Make sure it's running on `http://localhost:3000`

### Step 2: Start ngrok

In a separate terminal:
```powershell
ngrok http 3000
```

### Step 3: Test Webhook Connection

#### A. Manual Test (Webhook Verification)

Open your browser and visit:
```
http://localhost:3000/api/webhooks/meta-leads?hub.mode=subscribe&hub.verify_token=E2W_LMP_META_WEBHOOK_2025&hub.challenge=test123
```

**Expected response:** `test123`

#### B. Test with Real Lead

1. Go to your Facebook Page
2. Create a test lead ad or use existing one
3. Submit a test lead through the ad form
4. Check your application console logs

**Expected console output:**
```
📨 Received Meta lead: 123456789
✅ Lead placeholder created: cuid_xyz
```

#### C. Check Database

Query your database:
```sql
SELECT * FROM Lead WHERE source = 'Meta' ORDER BY createdAt DESC LIMIT 5;
```

You should see the new lead with `phone = 'PENDING'`

### Step 4: Test Polling (Data Fetch)

Manually trigger the polling endpoint:

```powershell
# Replace with your actual CRON_SECRET from .env
curl http://localhost:3000/api/cron/sync-meta-leads -H "Authorization: Bearer your-secret-key-change-in-production"
```

**Expected output:**
```json
{
  "success": true,
  "updatedPlaceholders": 1,
  "newLeads": 0,
  "message": "Sync completed successfully"
}
```

Check the database again - the lead should now have actual phone/email data.

---

## 7️⃣ Production Deployment

### Option A: Deploy to Vercel

1. Push your code to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel dashboard
4. Update Meta webhook URL to your production domain:
   ```
   https://your-domain.com/api/webhooks/meta-leads
   ```

### Option B: Other Hosting

Ensure your hosting:
- ✅ Supports HTTPS (required by Meta)
- ✅ Has public URL
- ✅ Can handle webhook POST requests

### Setup Cron Job for Polling

**Vercel:** Add `vercel.json`
```json
{
  "crons": [{
    "path": "/api/cron/sync-meta-leads",
    "schedule": "*/30 * * * *"
  }]
}
```

**Other platforms:** Use their cron/scheduler to hit:
```
GET https://your-domain.com/api/cron/sync-meta-leads
Authorization: Bearer YOUR_CRON_SECRET
```

---

## 8️⃣ Troubleshooting

### ❌ Webhook verification failed

**Problem:** Meta says "Callback verification failed"

**Solutions:**
1. Check ngrok URL is correct and HTTPS
2. Verify token matches exactly (case-sensitive)
3. Check your app is running
4. Look at console logs for errors

### ❌ Leads not appearing

**Problem:** Submitted lead form but no data in app

**Check:**
1. **Console logs:** Look for "Received Meta lead"
2. **Page subscription:** Ensure page is subscribed in webhooks
3. **Permissions:** Check page access token has `leads_retrieval`
4. **Database:** Run polling manually to fetch missed leads

### ❌ "PENDING" phone not updating

**Problem:** Lead created but phone stays "PENDING"

**Solution:** Run polling endpoint:
```powershell
curl http://localhost:3000/api/cron/sync-meta-leads -H "Authorization: Bearer YOUR_CRON_SECRET"
```

This will fetch full data from Meta API.

### ❌ Invalid signature error

**Problem:** Logs show "Invalid webhook signature"

**Solution:**
1. Verify `META_APP_SECRET` in `.env` matches Facebook App Secret exactly
2. Don't include quotes or extra spaces
3. Restart your app after changing `.env`

### ❌ ngrok URL keeps changing

**Problem:** Ngrok gives new URL every restart

**Solutions:**
1. **Free ngrok account:** Sign up at ngrok.com for fixed subdomain
2. **Alternative:** Use localtunnel (`npm install -g localtunnel`)
3. **Best:** Deploy to staging server with permanent URL

---

## 🎯 Quick Reference

### Webhook URL Format
```
https://your-domain.com/api/webhooks/meta-leads
```

### Polling URL (Cron)
```
https://your-domain.com/api/cron/sync-meta-leads
```

### Required Permissions
- `leads_retrieval`
- `pages_read_engagement`
- `pages_manage_ads`

### Key Environment Variables
```env
META_APP_SECRET=""
META_WEBHOOK_VERIFY_TOKEN=""
META_ACCESS_TOKEN=""
META_PAGE_ID=""
```

---

## 📞 Support

If you encounter issues:

1. Check **Console Logs** for detailed error messages
2. Verify all environment variables are set correctly
3. Test webhook verification manually
4. Use Meta's Webhook Testing Tool in App Dashboard

---

## ✅ Final Checklist

Before going live, verify:

- [ ] Facebook app created and configured
- [ ] Webhooks product added and subscribed to "leadgen"
- [ ] Page subscribed to your webhook
- [ ] All environment variables set in `.env`
- [ ] Webhook URL verified (green checkmark in Meta dashboard)
- [ ] Test lead submitted successfully
- [ ] Lead appears in database
- [ ] Polling endpoint updates placeholder leads
- [ ] Cron job scheduled for production
- [ ] ngrok removed and using production URL

---

**🎉 Congratulations! Your Meta Lead Ads integration is complete!**

Leads will now flow automatically from your Facebook/Instagram ads directly into your Lead Management Platform!
