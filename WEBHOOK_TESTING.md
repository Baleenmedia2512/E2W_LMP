# Webhook Testing Guide

## 🔍 What to Check

The webhook test page has been deployed to:
**https://e2-w-lmp.vercel.app/dashboard/webhook-test**

## 📋 Testing Steps

### 1. Access the Test Page
Go to: https://e2-w-lmp.vercel.app/dashboard/webhook-test

### 2. Check Webhook Status
Click the "Check Status" button to verify:
- ✅ All environment variables are set (META_ACCESS_TOKEN, META_APP_SECRET, etc.)
- ✅ Meta API connection is working
- ✅ Access token is valid and not expired
- ✅ Webhook subscription is active

### 3. Send Test Webhook
Click "Send Test Webhook" to simulate Meta sending a lead:
- This will POST a test payload to `/api/webhooks/meta-leads`
- Check the response status (should be 200)
- Look for any error messages

### 4. Check Browser Console
Press F12 to open developer tools and check for:
- Network requests to the webhook endpoint
- Console logs showing webhook processing
- Any JavaScript errors

### 5. Check Vercel Logs
Go to your Vercel dashboard:
1. Open your project: https://vercel.com/dashboard
2. Go to "Deployments" → Latest deployment
3. Click "Functions" tab
4. Look for `/api/webhooks/meta-leads` function logs

## 🐛 Common Issues

### Issue 1: Environment Variables Not Set
**Symptoms:** Status check shows missing environment variables
**Fix:** 
1. Go to Vercel dashboard → Project Settings → Environment Variables
2. Add all required variables:
   - `META_ACCESS_TOKEN`
   - `META_APP_SECRET`
   - `META_PAGE_ID`
   - `META_WEBHOOK_VERIFY_TOKEN`
3. Redeploy the application

### Issue 2: Access Token Expired
**Symptoms:** Meta API connection fails with 401/403
**Fix:**
1. Go to Meta Business Suite: https://business.facebook.com/
2. Navigate to your app settings
3. Generate a new long-lived access token
4. Update in Vercel environment variables
5. Redeploy

### Issue 3: Webhook Not Subscribed
**Symptoms:** Leads not received automatically, but test works
**Fix:**
1. Go to Meta App Dashboard: https://developers.facebook.com/apps
2. Select your app → Webhooks
3. Edit webhook subscription for "leadgen"
4. Set callback URL: `https://e2-w-lmp.vercel.app/api/webhooks/meta-leads`
5. Set verify token: The value from `META_WEBHOOK_VERIFY_TOKEN`
6. Subscribe to "leadgen" field

### Issue 4: Webhook Signature Validation Failing
**Symptoms:** 401 errors in webhook calls
**Fix:**
1. Verify `META_APP_SECRET` matches your Meta app secret
2. Check Vercel logs for signature validation errors
3. Temporarily disable signature check for testing (not recommended for production)

## 📊 What the Test Does

When you click "Send Test Webhook", it sends this payload:

```json
{
  "object": "page",
  "entry": [{
    "id": "YOUR_PAGE_ID",
    "time": 1234567890,
    "changes": [{
      "field": "leadgen",
      "value": {
        "leadgen_id": "test_lead_1234567890",
        "form_id": "123456789",
        "page_id": "YOUR_PAGE_ID",
        "ad_id": "987654321",
        "campaign_id": "789123456",
        "created_time": "1234567890"
      }
    }]
  }]
}
```

The webhook endpoint will:
1. ✅ Receive the payload
2. ✅ Parse the lead data
3. ✅ Try to fetch full lead details from Meta API (will fail for test lead)
4. ✅ Create a lead in the database
5. ✅ Assign to Gomathi (if configured)
6. ✅ Log activity

## 🔗 Quick Links

- **Webhook Test Page:** https://e2-w-lmp.vercel.app/dashboard/webhook-test
- **Leads Dashboard:** https://e2-w-lmp.vercel.app/dashboard/leads
- **Full Diagnostics:** https://e2-w-lmp.vercel.app/api/webhooks/meta-leads/test
- **Meta App Dashboard:** https://developers.facebook.com/apps
- **Vercel Dashboard:** https://vercel.com/dashboard

## 💡 Next Steps After Testing

1. If test webhook works → Configure real Meta webhook subscription
2. If test webhook fails → Check Vercel function logs for errors
3. Submit a test lead from actual Meta form
4. Check if lead appears in dashboard
5. Verify lead is assigned to Gomathi

## 🆘 Still Not Working?

Check the detailed logs at: https://e2-w-lmp.vercel.app/api/webhooks/meta-leads/test

This endpoint shows:
- Environment variable status
- Meta API connection status
- Access token validity and expiration
- Webhook subscription status
- Recent Meta leads in database
- Specific recommendations for fixes
