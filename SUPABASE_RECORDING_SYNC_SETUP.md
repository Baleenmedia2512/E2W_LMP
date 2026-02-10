# 🔧 How to Sync Call Recordings from Supabase to LMS

## Problem
Your Call Monitor app uploads recordings to Supabase successfully, but they don't appear in LMS Call Logs because the recording URLs aren't being saved to the LMS database.

## ✅ Solution: Webhook Integration

I've created a webhook endpoint that automatically syncs recordings from Supabase to your LMS database.

---

## Setup Instructions

### Option 1: Configure Call Monitor App to Send to Webhook (RECOMMENDED)

When the Call Monitor app uploads a recording to Supabase, it should also POST to your LMS webhook:

**Webhook URL:** `https://your-lms-domain.com/api/webhooks/supabase-recording`

**Payload Format:**
```json
{
  "phoneNumber": "9360381404",
  "recordingUrl": "https://wkwrrdcjknvupwsfdjtd.supabase.co/storage/v1/object/public/recordings/call-recordings/filename.m4a",
  "duration": 180,
  "fileName": "Call recording Ramesh Easy2work_260210_170348.m4a"
}
```

**Where to add this in your Call Monitor app:**

After successfully uploading to Supabase, add this code:

```javascript
// After Supabase upload succeeds
const recordingUrl = supabasePublicUrl; // Your Supabase URL
const phoneNumber = callPhoneNumber;   // The number that was called
const duration = callDuration;          // Duration in seconds

// Send to LMS webhook
try {
  const response = await fetch('https://your-lms-domain.com/api/webhooks/supabase-recording', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phoneNumber,
      recordingUrl,
      duration,
      fileName: fileName || 'recording.m4a'
    })
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('✅ Recording synced to LMS!');
    console.log('   Lead:', result.leadName);
    console.log('   Call Log ID:', result.callLogId);
  } else {
    console.log('ℹ️', result.message);
    // This is normal if the number isn't a lead in LMS yet
  }
} catch (error) {
  console.error('❌ Failed to sync recording to LMS:', error);
  // Recording is still safe in Supabase
}
```

---

### Option 2: Configure Supabase Database Webhook (Alternative)

If you can't modify the Call Monitor app, you can set up a Supabase Database Webhook:

1. **Go to Supabase Dashboard** → Your Project → Database → Webhooks

2. **Create New Webhook:**
   - **Name:** LMS Recording Sync
   - **Table:** `storage.objects`
   - **Events:** `INSERT`
   - **Type:** HTTP Request
   - **Method:** POST
   - **URL:** `https://your-lms-domain.com/api/webhooks/supabase-recording`
   - **HTTP Headers:** `Content-Type: application/json`

3. **Save Webhook**

⚠️ **Important:** With this method, the phone number must be in the filename (e.g., "9360381404_recording.m4a") or you'll need to modify your recording filenames to include the phone number.

---

## How It Works

```
📞 Call Made to Lead's Number
   ↓
🎙️ Call Monitor App Records Call
   ↓
☁️ Recording Uploads to Supabase
   ↓
📤 POST to LMS Webhook (with phone number + URL)
   ↓
🔍 LMS Searches for Lead by Phone Number
   ↓
   ├─ ✅ Lead Found
   │    ↓
   │    📝 Creates/Updates Call Log
   │    ↓
   │    💾 Saves Recording URL to Database
   │    ↓
   │    🎉 Recording Appears in LMS Call Logs!
   │
   └─ ❌ Lead Not Found
        ↓
        ℹ️ Recording Stays in Supabase (90 days)
        ↓
        ⏳ When number is added as lead later →
        ↓
        🔄 Next call will auto-sync
```

---

## Testing the Setup

### 1. Test the Webhook Endpoint

```bash
curl -X GET https://your-lms-domain.com/api/webhooks/supabase-recording
```

**Expected response:**
```json
{
  "status": "active",
  "endpoint": "/api/webhooks/supabase-recording",
  "message": "Supabase recording webhook is ready"
}
```

### 2. Test with a Sample Recording

```bash
curl -X POST https://your-lms-domain.com/api/webhooks/supabase-recording \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9360381404",
    "recordingUrl": "https://wkwrrdcjknvupwsfdjtd.supabase.co/storage/v1/object/public/recordings/test.m4a",
    "duration": 120
  }'
```

**If Lead Exists:**
```json
{
  "success": true,
  "message": "Recording synced and new call log created",
  "callLogId": "abc-123",
  "leadId": "lead-456",
  "leadName": "Test User",
  "recordingUrl": "https://..."
}
```

**If Lead Doesn't Exist:**
```json
{
  "success": false,
  "message": "No matching lead found",
  "phoneNumber": "9360381404",
  "hint": "Add this number as a lead in LMS to enable auto-sync"
}
```

---

## Verifying It Works

### Step 1: Add Test Lead
1. Open LMS
2. Create a new lead with phone: **9360381404**
3. Save

### Step 2: Make Test Call
1. Call **9360381404** from your phone
2. Have a short conversation (recording will start automatically)
3. End the call

### Step 3: Wait for Upload
- Recording uploads to Supabase (usually 5-10 seconds)
- Webhook sends data to LMS automatically

### Step 4: Check LMS
1. Go to the lead's page in LMS
2. Click **"Call History"** tab
3. You should see the call log with a **▶️ Play button**!

---

## Troubleshooting

### ❌ "Recording uploaded but not showing in LMS"

**Check 1:** Is the phone number saved as a lead in LMS?
```sql
-- Run in your database
SELECT id, name, phone, alternatePhone 
FROM "Lead" 
WHERE phone LIKE '%9360381404%' 
   OR "alternatePhone" LIKE '%9360381404%';
```

**Check 2:** Is the webhook being called?
- Check LMS server logs for `[Recording Sync Webhook]` messages
- If no logs → Webhook isn't being triggered

**Check 3:** Check the LMS URL in your Call Monitor app
- Make sure it's your production URL, not localhost
- e.g., `https://your-domain.vercel.app` or your actual domain

### ❌ "Webhook returns 'No matching lead found'"

This is **NORMAL** if:
- The phone number isn't added as a lead yet
- The recording is still safe in Supabase
- Add the number as a lead, then make another call

### ❌ "Recording shows but won't play"

**Check:**
- Is the Supabase URL publicly accessible? (try opening in browser)
- Are Supabase Storage permissions set to public for the recordings bucket?

**Fix Supabase Permissions:**
1. Supabase Dashboard → Storage → `recordings` bucket
2. Click **Policies**
3. Add policy: **Allow public read access**

---

## Environment Variables

Make sure these are set in your LMS `.env`:

```env
# Already configured
DATABASE_URL="your-database-url"
NEXT_PUBLIC_SUPABASE_URL="https://wkwrrdcjknvupwsfdjtd.supabase.co"

# Optional - for securing the webhook
RECORDING_WEBHOOK_SECRET="your-secret-key"
```

---

## What Happens to Old Recordings?

Recordings that were uploaded before setting up this webhook:
- ✅ Still safe in Supabase (90-day retention)
- ℹ️ Won't automatically sync to LMS
- 🔧 Can be manually added by:
  1. Going to the lead's page in LMS
  2. Clicking "Log Call"
  3. Manually pasting the recording URL

---

## Next Steps

1. ✅ Deploy the LMS changes (webhook is now live)
2. 📱 Update Call Monitor app to POST to webhook after Supabase upload
3. 🧪 Make a test call to verify it works
4. 🎉 Enjoy automatic recording sync!

---

## Need Help?

**Check Server Logs:**
```bash
# If using Vercel
vercel logs

# If using local server
npm run dev
# Look for "[Recording Sync Webhook]" messages
```

**Check Database:**
```sql
-- See recent call logs with recordings
SELECT 
  id,
  "leadId",
  "phoneDialed",
  "recordingUrl",
  "recordingStatus",
  "createdAt"
FROM "CallLog"
WHERE "recordingUrl" IS NOT NULL
ORDER BY "createdAt" DESC
LIMIT 10;
```

---

## Summary

✅ Webhook endpoint created: `/api/webhooks/supabase-recording`  
✅ Automatically matches recordings to leads by phone number  
✅ Creates call logs if needed  
✅ Handles both new and existing call logs  
✅ Safe fallback if lead doesn't exist  

**Your recordings will now automatically appear in LMS! 🎉**
