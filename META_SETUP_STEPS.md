# Meta Lead Ads Webhook Setup - Simple Step-by-Step Guide

## ✅ Prerequisites
- You have a Facebook Page with Lead Ads
- You have a Facebook App (Baleen Leads App)
- Your app is running at: http://localhost:3002

---

## 📝 STEP 1: Get Your Facebook App ID

1. Go to: https://developers.facebook.com/apps
2. Click on your app: **"Baleen Leads App"**
3. You'll see **App ID** at the top (a number like `1234567890`)
4. **COPY THIS NUMBER** - you'll need it later

---

## 🔑 STEP 2: Get Page Access Token (IMPORTANT!)

### A. Open Graph API Explorer
1. Go to: https://developers.facebook.com/tools/explorer
2. Make sure **"Baleen Leads App"** is selected in the top dropdown

### B. Switch to Page Token
1. Look at the right panel
2. Find **"User or Page"** section
3. Click **"User Token"** dropdown
4. Select **"Page"**

### C. Select Your Facebook Page
1. A new dropdown appears: **"Meta App"** or page selector
2. Click it and select your Facebook Page (the one with Lead Ads)

### D. Add Required Permissions
1. Click **"Add a Permission"** dropdown
2. Type: `leads_retrieval` → Click to add ✓
3. Click **"Add a Permission"** again
4. Type: `pages_manage_metadata` → Click to add ✓
5. Click **"Add a Permission"** again
6. Type: `pages_read_engagement` → Click to add ✓

You should now see these permissions:
- ✓ public_profile
- ✓ leads_retrieval
- ✓ pages_manage_metadata
- ✓ pages_read_engagement

### E. Generate Token
1. Click blue **"Generate Access Token"** button
2. Popup appears → Click **"Continue as [Your Name]"**
3. Review permissions → Click **"Done"**
4. A long token appears (starts with `EAAG...`)
5. Click the **copy icon** to copy it
6. **SAVE THIS TOKEN** in Notepad temporarily

---

## 🔄 STEP 3: Exchange for Long-Lived Token

### A. Build the Exchange URL
Copy this template and replace the values:

```
https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=e0dee842880f8b0f85a030753e7fbcf4&fb_exchange_token=YOUR_SHORT_TOKEN
```

**Replace:**
- `YOUR_APP_ID` = Your App ID from Step 1
- `YOUR_SHORT_TOKEN` = Token you just copied from Step 2E

**Example:**
```
https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=1234567890&client_secret=e0dee842880f8b0f85a030753e7fbcf4&fb_exchange_token=EAAGUzWi244AMBP2CV5eSLRMG8TmNDpnlP5XZAbLAphJFPnb6Gf...
```

### B. Get Long-Lived Token
1. Paste the complete URL in a new browser tab
2. Press Enter
3. You'll see JSON response like this:
```json
{
  "access_token": "EAAGUzW...(very long token)...",
  "token_type": "bearer",
  "expires_in": 5183944
}
```
4. **COPY the `access_token` value** (the long string)
5. This is your **60-day token** - save it!

---

## 📍 STEP 4: Get Your Facebook Page ID

1. Go to your Facebook Page
2. Click **Settings** (gear icon)
3. Click **Page Info** or **About** in left menu
4. Find **Page ID** (a number like `123456789012345`)
5. **COPY THIS NUMBER**

---

## ⚙️ STEP 5: Configure in Your App

### A. Open Your App
1. Open browser: http://localhost:3002
2. Login with **SuperAgent** account

### B. Go to Meta Settings
1. Click **Settings** in left sidebar
2. Click **Meta Integration** card

### C. Fill the Form
Enter these details:

**Facebook Page ID:**
```
[Paste from Step 4]
```

**Page Name:** (Optional)
```
Your page name - like "Baleen Media"
```

**Page Access Token:**
```
[Paste the LONG token from Step 3B]
```

**Webhook Verify Token:**
```
mySecret123Token
```
(You can use any random string - just remember it!)

### D. Save Configuration
1. Click **"Save Configuration"** button
2. Wait for success message
3. Status should show: **"Connected ✓"**

### E. Copy Webhook URL
1. Find **"Webhook Callback URL"** section
2. Copy the URL shown (like: `http://localhost:3002/api/meta/webhook`)
3. **SAVE THIS URL** - you need it for next step

---

## 🔗 STEP 6: Configure Facebook Webhook

### A. Go to Facebook App Dashboard
1. Go to: https://developers.facebook.com/apps
2. Click your app: **"Baleen Leads App"**
3. In left sidebar, find **"Webhooks"**
4. Click **"Webhooks"**

### B. Add Page Subscription
1. Click **"Add Subscription"** button
2. Select **"Page"** from the dropdown

### C. Enter Webhook Details

**Callback URL:**
```
[Paste the webhook URL from Step 5E]
```

**Verify Token:**
```
mySecret123Token
```
(Same as Step 5C!)

### D. Verify and Save
1. Click **"Verify and Save"** button
2. Wait for Facebook to verify (it will send a test request)
3. If successful, you'll see the webhook listed

### E. Subscribe to Lead Events
1. Find your webhook in the list
2. Click **"Edit"** or **"Add Subscriptions"**
3. Check the box for: **leadgen** ✓
4. Click **"Save"**

---

## 🧪 STEP 7: Test the Integration

### A. Create Test Lead Ad (if you don't have one)
1. Go to Facebook Ads Manager
2. Create a simple Lead Ad with a form
3. Or use existing Lead Ad

### B. Submit Test Lead
1. Go to your Lead Ad
2. Click **"Test"** button in Ads Manager
3. Or visit the ad and submit the form

### C. Check Your CRM
1. Go back to: http://localhost:3002
2. Go to **Settings → Meta Integration**
3. Scroll down to **"Recent Webhook Events"**
4. You should see the webhook event listed
5. Go to **Dashboard → Leads**
6. The new lead should appear!

---

## ✅ Success Checklist

- [ ] App ID copied
- [ ] Short-lived token generated
- [ ] Long-lived token obtained (60-day)
- [ ] Page ID copied
- [ ] Configuration saved in app (Status: Connected ✓)
- [ ] Webhook URL copied
- [ ] Facebook webhook configured
- [ ] Subscribed to `leadgen` events
- [ ] Test lead submitted
- [ ] Lead appears in CRM

---

## 🚨 Troubleshooting

### "Webhook verification failed"
- Make sure **Verify Token** in Facebook matches exactly what you entered in your app
- Check that your app is running at the webhook URL
- Ensure URL is publicly accessible (use ngrok for localhost testing)

### "No events received"
- Check Facebook App → Webhooks → Make sure `leadgen` is checked ✓
- Verify webhook is "Active" in Facebook
- Submit a test lead to trigger webhook

### "Token expired"
- Long-lived tokens last 60 days
- Generate a new token using Steps 2-3
- Update in Settings → Meta Integration

### "Lead not created in CRM"
- Go to Settings → Meta Integration → Recent Webhook Events
- Check for error messages
- Click **"Retry Failed"** button to retry

---

## 📞 Need Help?

If you get stuck:
1. Check **Recent Webhook Events** in Settings for error messages
2. Check browser console for errors (F12)
3. Ensure all permissions are granted in Facebook App
4. Verify tokens haven't expired

---

## 🎉 You're Done!

Once everything is working:
- New leads from Facebook will automatically appear in your CRM
- SuperAgents will get notifications
- All leads are saved with source: "Meta"

**Important Notes:**
- Tokens expire every 60 days - renew them
- Keep webhook URL secure
- Monitor webhook events regularly
- Test with real ads before going live

---

**Setup Date:** November 20, 2025
**App Secret:** Already configured in .env
**Webhook Endpoint:** `/api/meta/webhook`
