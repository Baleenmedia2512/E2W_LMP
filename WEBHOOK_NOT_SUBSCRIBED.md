# 🚨 WEBHOOK NOT RECEIVING LEADS - SOLUTION

## ✅ What We've Confirmed

1. ✅ Your database HAS 12 leads today (all manual/backfill)
2. ✅ Your webhook endpoint is WORKING: https://e2-w-lmp.vercel.app/api/webhooks/meta-leads
3. ✅ Meta API credentials are VALID
4. ✅ You have 10 active lead forms with 68+ leads available in Meta
5. ❌ **Meta is NOT sending webhook events to your app**

## 🎯 THE REAL PROBLEM

**Meta webhook is NOT subscribed or NOT configured correctly in Meta Business Manager.**

Your app is ready and working, but Meta doesn't know where to send the leads!

## 🔧 EXACT FIX STEPS

### Step 1: Check Current Webhook Subscription

1. Go to: https://developers.facebook.com/apps/847836698417663/webhooks/
2. Look for **"Page"** webhook subscriptions
3. Check if **"leadgen"** field is checked

**Expected:**
- ✅ Page webhook subscribed
- ✅ Leadgen field checked
- ✅ Callback URL: `https://e2-w-lmp.vercel.app/api/webhooks/meta-leads`

**If webhook doesn't exist or leadgen is unchecked, proceed to Step 2**

### Step 2: Subscribe Webhook (If Not Subscribed)

1. In Webhooks page, click **"Subscribe to Events"**
2. Select **"Page"**
3. Click **"Subscribe"** button
4. A modal will appear

**Enter these EXACT values:**

```
Callback URL: https://e2-w-lmp.vercel.app/api/webhooks/meta-leads
Verify Token: E2W_LMP_META_WEBHOOK_2025
```

5. Click **"Verify and Save"**
6. Wait for verification (should succeed immediately)

### Step 3: Subscribe to Leadgen Event

After webhook is subscribed:

1. Find your **Page** subscription
2. Click **"Edit"**
3. Check the box for **"leadgen"**
4. Click **"Save"**

### Step 4: Link Webhook to Your Page

1. Go to: https://developers.facebook.com/apps/847836698417663/webhooks/
2. Find **Page** subscription
3. Click **"Add Page Subscription"**
4. Select your page: **"E2W Digital Marketing"** (ID: 1552034478376801)
5. Click **"Subscribe"**

### Step 5: Test with Real Form Submission

1. Open one of your Meta lead forms (use form ID: 430957016708330)
2. Submit a TEST lead with:
   - Name: Test Webhook User
   - Phone: +919999999999
   - Any other fields

3. **Immediately check Vercel logs:**
   - Go to: https://vercel.com/baleenmedia2512/e2-w-lmp/logs
   - Look for: `"WEBHOOK POST RECEIVED"`

### Step 6: Verify Lead in Database

Run this command:

```powershell
cd c:\xampp\htdocs\E2W_LMP
node analyze-leads.js
```

**You should see:**
```
Real Webhook Leads: 1 (or more)
```

If still showing 0, webhook is NOT subscribed.

## 🔍 Alternative: Check Webhook Subscriptions via API

Run this to see your current webhook subscriptions:

```powershell
Invoke-WebRequest -Uri "https://graph.facebook.com/v18.0/847836698417663/subscriptions?access_token=EAAWnNnjnCxIBQOD8CHKD34TxdqDXY0meVqoH5i5wIjGiQZCgKMCQlZAF5SwAbNPPbCST8TkCtsQ8cS1LSbMit2KF6P51Eh1ijzG6TvnWrAotIpFIHZCySkZC7bnU9SyiaZCUUmDWjot3IjqkhLMHZBwh4LVrfn5rgiVHykTOKu6kq1OVxZCP4u8UqWtHVE3yYt" | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

**Expected output should include:**
```json
{
  "data": [
    {
      "object": "page",
      "callback_url": "https://e2-w-lmp.vercel.app/api/webhooks/meta-leads",
      "fields": ["leadgen"],
      "active": true
    }
  ]
}
```

## 🚨 Common Issues

### Issue 1: "Callback URL not reachable"
**Cause:** Your app might be down or Vercel is having issues
**Fix:** 
```powershell
# Test if webhook is reachable
Invoke-WebRequest -Uri "https://e2-w-lmp.vercel.app/api/webhooks/meta-leads?hub.mode=subscribe&hub.verify_token=E2W_LMP_META_WEBHOOK_2025&hub.challenge=test123"
```
Should return: `test123`

### Issue 2: "Verify token mismatch"
**Cause:** Token in Meta doesn't match your .env
**Fix:** Use EXACTLY: `E2W_LMP_META_WEBHOOK_2025`

### Issue 3: Webhook subscribed but no leads
**Cause:** Webhook not linked to specific page
**Fix:** Add Page Subscription (Step 4 above)

### Issue 4: Leads come in but marked as "manual_"
**Cause:** You're using backfill script, not real-time webhook
**Fix:** Webhook needs to be properly subscribed (Steps 2-4)

## 📊 How to Know It's Working

When webhook is properly configured:

1. Submit a lead in Meta form
2. Within **2-5 seconds**, lead appears in: https://e2-w-lmp.vercel.app/dashboard/leads
3. Lead has:
   - ✅ Real Meta Lead ID (not "manual_*")
   - ✅ Complete form data
   - ✅ Campaign/Ad/Adset information
   - ✅ Status: "new"
   - ✅ Notes: "Lead received via Meta webhook (real-time)"

## 🎯 Your Lead Forms

You have these active forms (use any to test):

1. **Auto Ads leads-copy** (838078545374957)
2. **Untitled form** (1480832969638771)
3. **Auto Ads leads** (1792237118319527)
4. **new-Hoardings-ads** (1347860400289679)
5. **leads from ad enquiry** (430957016708330) ← **Recommended for testing**

## 📱 Quick Test Commands

```powershell
# 1. Check webhook status
Invoke-WebRequest -Uri "https://e2-w-lmp.vercel.app/api/webhook-status" | ConvertFrom-Json

# 2. Check today's leads breakdown
node analyze-leads.js

# 3. Check Meta API subscriptions
Invoke-WebRequest -Uri "https://graph.facebook.com/v18.0/847836698417663/subscriptions?access_token=EAAWnNnjnCxIBQOD8CHKD34TxdqDXY0meVqoH5i5wIjGiQZCgKMCQlZAF5SwAbNPPbCST8TkCtsQ8cS1LSbMit2KF6P51Eh1ijzG6TvnWrAotIpFIHZCySkZC7bnU9SyiaZCUUmDWjot3IjqkhLMHZBwh4LVrfn5rgiVHykTOKu6kq1OVxZCP4u8UqWtHVE3yYt"
```

## 🎬 Final Check

After completing all steps:

1. Submit test lead in Meta form
2. Check Vercel logs: https://vercel.com/logs (should see "WEBHOOK POST RECEIVED")
3. Check database: `node analyze-leads.js` (should show Real Webhook Leads > 0)
4. Check dashboard: https://e2-w-lmp.vercel.app/dashboard/leads

**If all 4 pass, webhook is working! 🎉**

---

**Bottom line:** Your app is 100% ready. Meta just needs to be told WHERE to send the leads (webhook subscription).
