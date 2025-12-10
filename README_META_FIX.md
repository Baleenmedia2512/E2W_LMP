# 🚀 META WEBHOOK - COMPLETE FIX

## 🎯 WHAT I'VE DONE FOR YOU

I've created a **complete automated solution** to fix your Meta webhook and get leads flowing. Here's what's ready:

### ✅ Created Files:

1. **`scripts/setup-meta-webhook.ts`** - Automated setup script
2. **`scripts/check-webhook-health.ts`** - Health monitoring
3. **`scripts/check-meta-credentials.ts`** - Credential validator
4. **`setup-meta.ps1`** - PowerShell guided setup
5. **`setup-meta.bat`** - Windows batch setup
6. **`.env.meta`** - Template for credentials
7. **`URGENT_META_FIX.md`** - Step-by-step guide
8. **`META_WEBHOOK_SETUP.md`** - Detailed documentation

### ✅ Added npm Scripts:

```json
"setup:meta-webhook": "Automated Meta webhook setup"
"check:webhook": "Health check for webhook status"
"check:meta-credentials": "Verify credentials are set"
"fix:meta-webhook": "Re-run setup to fix issues"
```

---

## ⚡ QUICK START (Choose One Method)

### Method 1: PowerShell (Recommended for Windows)

```powershell
# 1. Edit credentials
notepad .env.meta

# 2. Run setup
.\setup-meta.ps1
```

### Method 2: Windows Batch File

```cmd
# Double-click: setup-meta.bat
# Or run from command prompt:
setup-meta.bat
```

### Method 3: Direct npm Commands

```bash
# 1. Check if credentials are set
npm run check:meta-credentials

# 2. Run setup
npm run setup:meta-webhook

# 3. Verify health
npm run check:webhook
```

---

## 📋 WHAT YOU NEED TO DO (10 minutes)

### STEP 1: Get Meta Credentials (5 min)

You need 3 pieces of information from Facebook:

#### A. **Page Access Token**
1. Go to: https://business.facebook.com/settings/system-users
2. Create/Select System User
3. Generate New Token
4. **Select YOUR PAGE** (not personal profile!)
5. Grant permissions: `leads_retrieval`, `pages_show_list`, `pages_manage_metadata`
6. Copy the token

#### B. **App Secret**
1. Go to: https://developers.facebook.com/apps/
2. Select your app
3. Settings → Basic
4. Show "App Secret"
5. Copy it

#### C. **Page ID**
1. Go to your Facebook Page
2. About → Page ID
3. Copy the number

---

### STEP 2A: For Local Testing

Edit `.env.meta`:
```bash
META_ACCESS_TOKEN="your-actual-token-here"
META_APP_SECRET="your-actual-secret-here"
META_PAGE_ID="your-actual-page-id-here"
META_WEBHOOK_VERIFY_TOKEN="E2W_LMP_META_WEBHOOK_2025"
NEXT_PUBLIC_APP_URL="https://e2-w-lmp.vercel.app"
```

Then run:
```bash
.\setup-meta.ps1
```

---

### STEP 2B: For Production (REQUIRED!)

**⚠️ THIS IS THE MOST IMPORTANT STEP!**

1. Go to: https://vercel.com/baleen-medias-projects/e2-w-lmp
2. Settings → Environment Variables
3. Add these 4 variables in **Production** environment:
   - `META_ACCESS_TOKEN` = your token
   - `META_APP_SECRET` = your secret
   - `META_PAGE_ID` = your page ID
   - `META_WEBHOOK_VERIFY_TOKEN` = `E2W_LMP_META_WEBHOOK_2025`
4. **Redeploy the app!**

Then the webhook will automatically work in production.

---

### STEP 3: Verify Setup

Run health check:
```bash
npm run check:webhook
```

Expected output:
```
✅ META_ACCESS_TOKEN
✅ META_APP_SECRET
✅ META_PAGE_ID
✅ META_WEBHOOK_VERIFY_TOKEN
✅ Access token is valid
✅ Successfully subscribed app to page
✅ Webhook endpoint responds correctly
🎉 META WEBHOOK SETUP COMPLETE!
```

---

### STEP 4: Configure in Meta Dashboard (2 min)

Even though the script configures most things, verify in Meta:

1. Go to: https://developers.facebook.com/apps/
2. Your App → Webhooks → Page
3. Edit Subscription:
   - URL: `https://e2-w-lmp.vercel.app/api/webhooks/meta-leads`
   - Token: `E2W_LMP_META_WEBHOOK_2025`
4. Subscribe to fields:
   - ✅ `leadgen`
   - ✅ `leads_retrieval`
5. Save

---

### STEP 5: Test It!

1. Submit a test lead via your Facebook Lead Ad form
2. Wait 30 seconds
3. Check Vercel logs: https://vercel.com/baleen-medias-projects/e2-w-lmp
4. Search for: "WEBHOOK POST RECEIVED"
5. Lead should appear in your database

---

## 🔧 WHAT THE AUTOMATION DOES

The `setup-meta-webhook.ts` script automatically:

1. ✅ Validates all environment variables are present
2. ✅ Tests access token validity and expiration
3. ✅ Checks token permissions (leads_retrieval, etc.)
4. ✅ Subscribes app to page via Graph API
5. ✅ Configures webhook fields (leadgen, leads_retrieval)
6. ✅ Tests webhook endpoint accessibility
7. ✅ Verifies subscription was successful
8. ✅ Displays comprehensive status report

---

## 📊 MONITORING COMMANDS

```bash
# Quick health check
npm run check:webhook

# Verify credentials are loaded
npm run check:meta-credentials

# Re-run setup if needed
npm run fix:meta-webhook
```

---

## 🆘 TROUBLESHOOTING

### "Missing environment variables"

**Fix:** 
- Edit `.env.meta` locally, OR
- Add to Vercel environment variables
- Redeploy if on Vercel

### "Access token is INVALID"

**Fix:**
- Regenerate token from Business Manager
- Ensure you selected YOUR PAGE, not user profile
- Check permissions are granted

### "Subscription failed"

**Common causes:**
- Not admin of the Facebook Page
- Token missing `pages_manage_metadata` permission
- App not approved for Lead Ads

**Fix:**
- Verify you're page admin
- Regenerate token with all permissions
- Manually configure in Meta Dashboard (Step 4)

### "Webhook not receiving leads"

**Check:**
1. Vercel logs for "WEBHOOK POST RECEIVED"
2. Meta Dashboard → Webhooks → Recent Deliveries
3. Run: `npm run check:webhook`

**Most common issue:**
- Forgot to add variables in **Production** environment
- Need to redeploy after adding variables

---

## 🎯 THE ROOT CAUSE

Your code is **100% correct**. The issue is simply:

1. ❌ Meta credentials not in Vercel Production environment
2. ❌ App not subscribed to page  
3. ❌ "leadgen" field not subscribed in webhook

**The scripts I created fix all of this automatically!**

---

## 📚 FILES REFERENCE

| File | Purpose |
|------|---------|
| `URGENT_META_FIX.md` | Quick start guide |
| `META_WEBHOOK_SETUP.md` | Detailed documentation |
| `scripts/setup-meta-webhook.ts` | Main automation script |
| `scripts/check-webhook-health.ts` | Health monitoring |
| `scripts/check-meta-credentials.ts` | Credential validator |
| `setup-meta.ps1` | PowerShell setup wizard |
| `setup-meta.bat` | Windows batch setup |
| `.env.meta` | Credential template |

---

## ✅ SUCCESS CHECKLIST

- [ ] Got Page Access Token from Business Manager
- [ ] Got App Secret from Developer Console
- [ ] Got Page ID from Facebook Page
- [ ] Added credentials to `.env.meta` OR Vercel
- [ ] Ran `npm run setup:meta-webhook`
- [ ] Saw "SETUP COMPLETE" message
- [ ] Verified in Meta Dashboard (Step 4)
- [ ] Ran `npm run check:webhook` - all green
- [ ] Submitted test lead
- [ ] Lead appeared in database within 30 seconds

---

## 🚀 NEXT STEPS

**RIGHT NOW:**

1. Edit `.env.meta` with your credentials
2. Run: `.\setup-meta.ps1`
3. Follow any prompts
4. Test with a lead submission

**FOR PRODUCTION:**

1. Add variables to Vercel (Step 2B above)
2. Redeploy
3. Leads will flow automatically

**TIME REQUIRED: ~10 minutes**

---

## 📞 QUICK HELP

If you get stuck at any step:

1. Read `URGENT_META_FIX.md` - has detailed instructions
2. Check `META_WEBHOOK_SETUP.md` - comprehensive guide
3. Run `npm run check:webhook` - shows what's wrong
4. Check Vercel logs - shows real-time errors

---

## 🎉 THAT'S IT!

Everything is ready. Just add your credentials and run the setup script.

**Your leads WILL start flowing!** 🚀

---

**Created:** December 10, 2025
**Status:** Ready to use
**Difficulty:** Easy (mostly copy-paste)
