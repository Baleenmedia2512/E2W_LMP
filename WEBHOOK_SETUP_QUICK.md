# ⚡ Quick Start: Meta Webhook Setup (5 Minutes)

## 🎯 For Local Development Testing

### Step 1: Install ngrok (1 minute)

**Windows PowerShell:**
```powershell
choco install ngrok
```

Or download: https://ngrok.com/download

---

### Step 2: Start Everything (1 minute)

**Terminal 1 - Start your app:**
```powershell
cd c:\xampp\htdocs\E2W_LMP
npm run dev
```

**Terminal 2 - Start ngrok:**
```powershell
ngrok http 3000
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

---

### Step 3: Create Facebook App (2 minutes)

1. Go to: https://developers.facebook.com/apps
2. Click **"Create App"** → **"Business"**
3. Name: `E2W LMP Test`
4. Add Products:
   - ✅ **Webhooks**
   - ✅ **Lead Ads**

---

### Step 4: Configure Webhook (1 minute)

In Facebook App → **Webhooks** → **Page** → **Edit Subscription**:

**Callback URL:**
```
https://YOUR-NGROK-URL.ngrok.io/api/webhooks/meta-leads
```

**Verify Token:**
```
E2W_LMP_META_WEBHOOK_2025
```

**Fields:** Check ✅ **leadgen**

Click **"Verify and Save"**

---

### Step 5: Subscribe Your Page (30 seconds)

1. In Webhooks → Page section
2. Click **"Subscribe to this object"**
3. Select your Facebook Page
4. Click **"Subscribe"**

---

### Step 6: Get Credentials (1 minute)

**App Secret:**
- Settings → Basic → App Secret (click "Show")

**Page Access Token:**
- https://developers.facebook.com/tools/accesstoken
- Find your page → Copy token

**Page ID:**
- Your Facebook Page → About → Page ID

---

### Step 7: Update .env File

Create `.env` (copy from `.env.example`):

```env
META_APP_SECRET="paste_app_secret_here"
META_WEBHOOK_VERIFY_TOKEN="E2W_LMP_META_WEBHOOK_2025"
META_ACCESS_TOKEN="paste_page_access_token_here"
META_PAGE_ID="paste_page_id_here"
```

**Restart your app** (`Ctrl+C` then `npm run dev`)

---

## ✅ Test It!

1. Submit a test lead on your Facebook Lead Ad
2. Check console logs - should see:
   ```
   📨 Received Meta lead: 123456789
   ✅ Lead placeholder created
   ```
3. Run polling to fetch full data:
   ```powershell
   curl http://localhost:3000/api/cron/sync-meta-leads -H "Authorization: Bearer your-secret-key-change-in-production"
   ```

---

## 🚀 Done!

Leads now flow: **Meta Ad → Webhook → Your Database**

**Need detailed setup?** See `META_INTEGRATION_GUIDE.md`

---

## 🔧 Quick Troubleshooting

**Webhook verification fails?**
- Check ngrok is running and URL is correct
- Verify token must match exactly

**No leads appearing?**
- Check page is subscribed in Meta dashboard
- Look at console logs for errors
- Run polling endpoint manually

**Phone stays "PENDING"?**
- Run the polling endpoint (curl command above)
- It fetches full data from Meta API
