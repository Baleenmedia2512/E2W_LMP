# ⚡ Quick Fix: Show Recordings in LMS Call Logs

## 🔴 Current Problem
Your logs show: **"⚠️ Uploaded to Supabase but not synced with LMS"**

Recordings are successfully uploading to Supabase, but they're not appearing in the LMS because the recording URLs aren't being saved to the database.

---

## ✅ Solution (Choose One)

### Option A: Auto-Sync with Webhook (5 minutes)

**What I did:**
- ✅ Created webhook endpoint: `/api/webhooks/supabase-recording`
- ✅ Webhook automatically syncs recordings to LMS database

**What you need to do:**

1. **Deploy the changes to your LMS:**
   ```powershell
   # In your LMS directory
   npm run build
   vercel --prod
   ```

2. **Update your Call Monitor app** to send recordings to webhook.

   Find where the app uploads to Supabase (the code that shows "✅ File uploaded to Supabase"), and add this right after:

   ```javascript
   // After successful Supabase upload
   const lmsUrl = 'https://your-lms-domain.com'; // Replace with your actual LMS URL
   
   fetch(`${lmsUrl}/api/webhooks/supabase-recording`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       phoneNumber: '9360381404', // The actual phone number that was called
       recordingUrl: supabasePublicUrl, // The Supabase URL you just got
       duration: callDuration // Duration in seconds
     })
   })
   .then(res => res.json())
   .then(data => {
     if (data.success) {
       console.log('✅ Recording synced to LMS!', data.leadName);
     } else {
       console.log('ℹ️', data.message); // "No matching lead" is normal
     }
   });
   ```

3. **Make a test call** to any lead in your LMS
   - Recording will automatically appear in Call History! 🎉

---

### Option B: Manual Sync (2 minutes per recording)

If you can't modify the Call Monitor app right now, manually sync existing recordings:

**For the recording from your logs:**

```powershell
# Navigate to LMS directory
cd c:\xampp\htdocs\E2W_LMP

# Make sure LMS is running
npm run dev

# In another PowerShell window, sync the recording
node manual-sync-recording.js 9360381404 "https://wkwrrdcjknvupwsfdjtd.supabase.co/storage/v1/object/public/recordings/call-recordings/1770723282215_Call%20recording%20Ramesh%20Easy2work_260210_170348.m4a" 9
```

**Expected output:**
```
✅ Recording synced successfully!
   Lead Name: [Lead Name]
   Call Log ID: abc-123
   
🎉 You can now see this recording in the LMS!
```

---

## 🧪 Quick Test

Test the webhook is working:

```powershell
# Test GET endpoint
curl http://localhost:3000/api/webhooks/supabase-recording
```

**Should return:**
```json
{
  "status": "active",
  "message": "Supabase recording webhook is ready"
}
```

---

## 📱 Where to Find the Code in Call Monitor App

Based on your logs, look for code near these messages:
- `"✅ File uploaded to Supabase"`
- `"📤 Upload successful!"`
- `"ℹ️ Not an LMS call - recording uploaded to Supabase only"`

**Add the webhook call right after upload succeeds.**

Example location (look for similar code in your app):

```javascript
// AFTER this:
console.log('✅ File uploaded to Supabase:', supabaseUrl);
console.log('ℹ️ Not an LMS call - recording uploaded to Supabase only');

// ADD this:
try {
  const lmsResponse = await fetch('https://your-lms.com/api/webhooks/supabase-recording', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: phoneNumberCalled,
      recordingUrl: supabaseUrl,
      duration: callDurationSeconds
    })
  });
  
  const result = await lmsResponse.json();
  if (result.success) {
    console.log('✅ Recording synced to LMS!');
  }
} catch (err) {
  // Don't fail if LMS is down - recording is still in Supabase
  console.warn('⚠️ Could not sync to LMS, but recording is safe in Supabase');
}
```

---

## 🎯 What This Fixes

**Before:**
```
Call Made → Recording Uploads → ✅ In Supabase
                              → ❌ NOT in LMS
                              → 🚫 Can't see in Call Logs
```

**After:**
```
Call Made → Recording Uploads → ✅ In Supabase
                              → ✅ Webhook to LMS
                              → ✅ Saved to Database
                              → 🎉 Shows in Call Logs!
```

---

## ⚠️ Important Notes

1. **Phone number must be a lead in LMS**
   - If you call a number that's not in LMS, recording goes to Supabase only (this is normal)
   - Add the number as a lead, then make another call

2. **Existing recordings**
   - Won't auto-sync (they were uploaded before webhook existed)
   - Use `manual-sync-recording.js` to sync them

3. **New recordings**
   - Will auto-sync once you add the webhook call to your app

---

## 🆘 Troubleshooting

### "No matching lead found"

This means the phone number isn't in your LMS yet. Solutions:
1. Add the number as a lead in LMS
2. Make another call to that number
3. OR manually add the recording URL in LMS (Log Call → paste URL)

### "Recording won't play"

Check Supabase permissions:
1. Supabase Dashboard → Storage → `recordings` bucket
2. Policies → Add policy for public read access

### "Webhook not receiving calls"

1. Check LMS is running and accessible
2. Verify the URL in Call Monitor app is correct
3. Check LMS server logs for `[Recording Sync Webhook]` messages

---

## 📊 Verify It's Working

1. **Make a test call to a lead**
2. **Check LMS server logs** for:
   ```
   [Recording Sync Webhook] Received notification
   [Recording Sync Webhook] ✅ Found lead: [Name]
   [Recording Sync Webhook] ✅ Call log updated with recording!
   ```
3. **Open lead page** → Call History tab → Should see ▶️ Play button!

---

## 🎉 Success!

Once set up, all future recordings will automatically appear in your LMS call logs!

**Next Recording:**
Call → Upload → Auto-Sync → ✅ Appears in LMS (within 5 seconds!)
