# 🚨 URGENT: META WEBHOOK FIX

## ⚡ IMMEDIATE ACTION REQUIRED

Your Meta webhook code is **perfect**, but it's not configured. Follow these steps **right now** to get leads flowing:

---

## 🎯 STEP 1: GET YOUR META CREDENTIALS (5 minutes)

### A. Get Page Access Token

1. **Go to:** https://business.facebook.com/settings/system-users
2. **Create System User** (or select existing)
3. Click **"Generate New Token"**
4. **Select YOUR FACEBOOK PAGE** (not your personal profile!)
5. **Check these permissions:**
   - ✅ leads_retrieval
   - ✅ pages_show_list  
   - ✅ pages_manage_metadata
   - ✅ pages_read_engagement
6. Click **"Generate Token"**
7. **COPY THE TOKEN** → Save it temporarily

### B. Get App Secret

1. **Go to:** https://developers.facebook.com/apps/
2. **Select your app**
3. **Settings → Basic**
4. Find **"App Secret"**
5. Click **"Show"**
6. **COPY THE SECRET** → Save it temporarily

### C. Get Page ID

1. **Go to your Facebook Page**
2. **Click "About"**
3. Scroll to **"Page ID"**
4. **COPY THE NUMBER** → Save it temporarily

---

## 🎯 STEP 2: CONFIGURE VERCEL (2 minutes)

**This is THE MOST IMPORTANT STEP!**

1. **Go to:** https://vercel.com/baleen-medias-projects/e2-w-lmp
2. Click **"Settings"** tab
3. Click **"Environment Variables"**
4. **Add these 4 variables** (click "Add Another" for each):

| Name | Value | Environment |
|------|-------|-------------|
| `META_ACCESS_TOKEN` | Paste token from Step 1A | Production |
| `META_APP_SECRET` | Paste secret from Step 1B | Production |
| `META_PAGE_ID` | Paste page ID from Step 1C | Production |
| `META_WEBHOOK_VERIFY_TOKEN` | `E2W_LMP_META_WEBHOOK_2025` | Production |

5. Click **"Save"** for each
6. **IMPORTANT: Redeploy your app!**
   - Go to "Deployments" tab
   - Click "..." menu on latest deployment
   - Click "Redeploy"
   - Wait for deployment to complete (~2 minutes)

---

## 🎯 STEP 3: RUN AUTOMATED SETUP (1 minute)

### Option A: Via PowerShell (Easiest)

1. **Open PowerShell in your project directory**
2. **Edit .env.meta file:**
   ```powershell
   notepad .env.meta
   ```
3. **Replace placeholder values** with your actual credentials
4. **Save and close**
5. **Run setup:**
   ```powershell
   .\setup-meta.ps1
   ```

### Option B: Via npm (Alternative)

1. **Edit .env.meta file** with your credentials
2. **Run:**
   ```bash
   npm run setup:meta-webhook
   ```

**Expected Output:**
```
✅ All required environment variables are present
✅ Access token is valid
✅ Successfully subscribed app to page with leadgen fields
✅ Webhook endpoint responds correctly to verification
🎉 META WEBHOOK SETUP COMPLETE!
```

---

## 🎯 STEP 4: VERIFY IN META DASHBOARD (2 minutes)

1. **Go to:** https://developers.facebook.com/apps/
2. **Select your app**
3. **Products → Webhooks**
4. **Find "Page" section**
5. Click **"Edit Subscription"**
6. **Enter:**
   - Callback URL: `https://e2-w-lmp.vercel.app/api/webhooks/meta-leads`
   - Verify Token: `E2W_LMP_META_WEBHOOK_2025`
7. Click **"Verify and Save"**
8. **Subscribe to fields:**
   - ✅ leadgen
   - ✅ leads_retrieval (optional)
9. Click **"Save"**

---

## 🎯 STEP 5: TEST IT! (1 minute)

### A. Check Health

```bash
npm run check:webhook
```

Should show all ✅ green checks.

### B. Submit Test Lead

1. Create a test Lead Ad form on Facebook
2. Submit a test entry
3. **Wait 30 seconds**
4. Check your database or login to app

### C. Verify in Vercel Logs

1. Go to: https://vercel.com/baleen-medias-projects/e2-w-lmp
2. **Deployments → [Latest] → Runtime Logs**
3. Search for: `WEBHOOK POST RECEIVED`
4. Should see lead processing logs

---

## ✅ SUCCESS CHECKLIST

- [ ] Got Page Access Token from Business Manager
- [ ] Got App Secret from Developer Console  
- [ ] Got Page ID from Facebook Page
- [ ] Added all 4 environment variables in Vercel
- [ ] Redeployed Vercel app
- [ ] Ran `npm run setup:meta-webhook` successfully
- [ ] Configured webhook in Meta Dashboard
- [ ] Subscribed to "leadgen" field
- [ ] Ran `npm run check:webhook` - all green
- [ ] Submitted test lead
- [ ] Lead appeared in database

---

## 🆘 IF SOMETHING FAILS

### "Missing environment variables"
→ Check Vercel environment variables are in **Production** environment
→ Redeploy after adding variables

### "Access token is INVALID"
→ Regenerate token from Business Manager
→ Ensure you selected YOUR PAGE, not user profile
→ Check all 4 permissions are granted

### "Subscription failed"
→ Ensure you're admin of the Facebook Page
→ Check token has `pages_manage_metadata` permission
→ Try manual subscription via Meta Dashboard (Step 4)

### "Webhook endpoint not reachable"
→ Ensure app is deployed: https://e2-w-lmp.vercel.app
→ Check NEXT_PUBLIC_APP_URL is correct in Vercel
→ HTTPS is required (Vercel provides this automatically)

### "Leads not appearing"
→ Check Vercel logs for errors
→ Verify "leadgen" field is subscribed in Meta Dashboard
→ Run: `npm run check:webhook` to diagnose

---

## 📞 QUICK COMMANDS

```bash
# Setup webhook (first time)
npm run setup:meta-webhook

# Check webhook health
npm run check:webhook

# Fix existing webhook
npm run fix:meta-webhook

# PowerShell guided setup
.\setup-meta.ps1
```

---

## 🎯 THE CORE ISSUE

Your webhook **code is perfect**. The issue is:

1. ❌ Meta credentials not in Vercel environment variables
2. ❌ App not subscribed to page
3. ❌ "leadgen" field not subscribed

**Follow Steps 1-5 above and leads WILL flow!**

---

## 📊 MONITORING

After setup, monitor via:

1. **Vercel Logs:** https://vercel.com/baleen-medias-projects/e2-w-lmp
2. **Health Check:** `npm run check:webhook`
3. **Test Endpoint:** https://e2-w-lmp.vercel.app/api/webhooks/meta-leads/test

---

**TIME TO COMPLETE: ~10 minutes**
**DIFFICULTY: Easy (mostly copy-paste)**

**DO THIS NOW!** 🚀
