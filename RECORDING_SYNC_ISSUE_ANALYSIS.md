# 🔍 DEEP ANALYSIS: Why Recordings Are in Supabase But Not in LMS

## 📊 Current Situation

### ✅ What's Working:
1. **Recordings ARE being uploaded to Supabase Storage**
   - Bucket: `recordings/call-recordings/`
   - Example file: `1770789394301_1770789394111_Call recording Adthi E2W_260211_112454.m4a`
   - Storage location confirmed in your screenshot

2. **Call logs ARE being created in LMS database**
   - Lead: "adithyatest" (ID: 12319766-5879-4019-abfb-d1c181b7b9d4)
   - 5 calls on February 11, 2026
   - All with status "answer" and duration (23-47 seconds)

### ❌ What's Broken:
1. **Recordings are NOT linked to LMS calls**
   - All call logs have `recordingUrl = NULL`
   - All call logs have `recordingStatus = "pending"`
   - UI shows "No recording" for all calls

---

## 🔴 ROOT CAUSES

### Problem 1: **Missing Webhook Integration** (PRIMARY ISSUE)

The webhook endpoint exists (`/api/webhooks/supabase-recording`) but is **NOT being triggered**.

**Why?**

There are two ways to trigger the webhook:

#### Option A: Supabase Storage Webhook ❌ NOT CONFIGURED
- Supabase has a webhook feature that can POST to your API when files are uploaded
- **Current Status:** This webhook is NOT configured in your Supabase dashboard
- **Location:** Supabase Dashboard → Database → Webhooks → (No webhook configured for storage)

#### Option B: Call Monitor App Integration ❌ NOT IMPLEMENTED
- After uploading to Supabase, the Call Monitor app should POST to the webhook
- **Current Status:** The app uploads to Supabase but does NOT call your LMS webhook
- **Missing:** The integration code from `CALL_MONITOR_INTEGRATION.md` is not implemented in the mobile app

---

### Problem 2: **Phone Number Mismatch** (SECONDARY ISSUE)

Even if the webhook was called, there may be a phone number matching issue:

**Example from Supabase filename:**
```
1770789394301_1770789394111_Call recording Adthi E2W_260211_112454.m4a
```

**Phone numbers in filename:**
- `1770789394301` (13 digits)
- `1770789394111` (13 digits)
- Last 10 digits: `0789394301` and `0789394111`

**Lead phone in LMS:**
- `9360515518` (10 digits)

**Mismatch:** The phones in the recording filename (`0789394301`, `0789394111`) don't match the lead's phone (`9360515518`).

**What these numbers might be:**
- First number: Agent's phone number?
- Second number: System/PBX number?
- Third number (not in filename): Customer's actual number?

---

## 💡 SOLUTIONS

### Solution 1: Configure Supabase Storage Webhook (RECOMMENDED)

This automatically triggers your webhook when files are uploaded.

#### Steps:

1. **Go to Supabase Dashboard:**
   - Navigate to: `Database` → `Webhooks`

2. **Create New Webhook:**
   ```
   Name: Call Recording Upload Notifier
   Type: Storage object created
   Events: INSERT on storage.objects
   Method: POST
   URL: https://e2wleadmanager.vercel.app/api/webhooks/supabase-recording
   ```

3. **Configure Payload:**
   - Use the default Supabase webhook format
   - The webhook expects: `{ type: 'INSERT', record: { name, bucket_id, metadata } }`

4. **Add Bucket Filter (Optional):**
   ```sql
   WHERE bucket_id = 'recordings'
   ```

5. **Test the Webhook:**
   - Upload a test file to Supabase Storage
   - Check Vercel logs for: `[Recording Sync Webhook] Received notification`

---

### Solution 2: Update Call Monitor App to Call Webhook (ALTERNATIVE)

If you can't configure Supabase webhooks, modify the Call Monitor app.

#### In Call Monitor App Code:

**After uploading to Supabase, add this:**

```typescript
// After successful Supabase upload
const recordingUrl = `${supabaseUrl}/storage/v1/object/public/recordings/${fileName}`;

// Notify LMS
try {
  await fetch('https://e2wleadmanager.vercel.app/api/webhooks/supabase-recording', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phoneNumber: customerPhone,  // The customer's phone (from lead)
      recordingUrl: recordingUrl,
      duration: callDuration,
      fileName: fileName
    })
  });
  console.log('✅ Recording synced to LMS');
} catch (error) {
  console.error('❌ Failed to sync recording:', error);
}
```

**CRITICAL:** Make sure `phoneNumber` is the **customer's phone number** (the one stored in LMS Lead), NOT the agent's phone or system phone.

---

### Solution 3: Fix Phone Number Matching

The webhook currently extracts phone from the filename, which may not match the lead's phone.

#### Current Logic in Webhook:
```typescript
// Extracts first 10+ digit number from filename
const phoneMatch = fName.match(/(\d{10,})/);
phoneNumber = phoneMatch[1].slice(-10); // Takes last 10 digits
```

#### Problem:
- If filename has `1770789394301_1770789394111_...`
- It extracts `1770789394301`
- Last 10 digits: `0789394301`
- But lead phone is: `9360515518` ❌ No match!

#### Fix Options:

**Option A:** Include customer phone in filename
```
9360515518_1770789394301_Call recording Adthi...
```

**Option B:** Use metadata instead of filename
```typescript
// In Call Monitor app when uploading
metadata: {
  phoneNumber: '9360515518',
  leadId: 'xxx',
  agentPhone: '1770789394301'
}
```

**Option C:** Send explicit phone in webhook payload (RECOMMENDED)
```typescript
// In Call Monitor app
{
  phoneNumber: '9360515518',  // Explicit customer phone
  recordingUrl: '...',
  duration: 45
}
```

---

## 🧪 VERIFICATION & TESTING

### Step 1: Test Webhook Manually

Create a test file: `test-webhook.ts`

```typescript
async function testWebhook() {
  const response = await fetch('https://e2wleadmanager.vercel.app/api/webhooks/supabase-recording', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: '9360515518',
      recordingUrl: 'https://wkwrrdcjknvupwsfdjtd.supabase.co/storage/v1/object/public/recordings/test.m4a',
      duration: 45,
      fileName: 'test.m4a'
    })
  });
  
  const result = await response.json();
  console.log(result);
}

testWebhook();
```

**Expected Result:**
```json
{
  "success": true,
  "message": "Recording linked to existing call log",
  "callLogId": "...",
  "leadId": "...",
  "recordingUrl": "..."
}
```

### Step 2: Check Vercel Logs

After making a test call:

```bash
# View recent logs
vercel logs --follow

# Look for these messages:
# [Recording Sync Webhook] Received notification
# [Recording Sync Webhook] Found lead: ...
# [Recording Sync Webhook] ✅ Call log updated with recording!
```

### Step 3: Verify Database Update

```sql
SELECT 
  id, 
  "phoneDialed", 
  "recordingUrl", 
  "recordingStatus",
  "createdAt"
FROM "CallLog" 
WHERE "leadId" = '12319766-5879-4019-abfb-d1c181b7b9d4'
ORDER BY "createdAt" DESC;
```

**Should show:**
- `recordingUrl` populated with actual URL
- `recordingStatus` = `'available'`

### Step 4: Test in UI

1. Go to lead details page
2. Click "Call Logs (5)" tab
3. Should see recording player with play button
4. Click play → recording should play

---

## 📋 IMPLEMENTATION CHECKLIST

- [ ] **Choose integration method:**
  - [ ] Option A: Configure Supabase Storage Webhook
  - [ ] Option B: Update Call Monitor app to call webhook

- [ ] **If using Supabase webhook:**
  - [ ] Create webhook in Supabase Dashboard
  - [ ] Configure for storage.objects INSERT events
  - [ ] Point to: `/api/webhooks/supabase-recording`
  - [ ] Test with file upload

- [ ] **If updating Call Monitor app:**
  - [ ] Add POST request after Supabase upload
  - [ ] Include correct customer phone number
  - [ ] Handle errors gracefully
  - [ ] Test with real call

- [ ] **Fix phone number matching:**
  - [ ] Ensure customer phone is in filename/metadata
  - [ ] Or send explicit phone in webhook payload
  - [ ] Verify phone format (10 digits)

- [ ] **Testing:**
  - [ ] Manual webhook test passes
  - [ ] Real call creates recording
  - [ ] Recording syncs to database
  - [ ] Recording shows in UI
  - [ ] Recording plays correctly

---

## 🎯 QUICK FIX FOR EXISTING RECORDINGS

If you want to manually link the existing recordings to call logs:

```typescript
// manual-link-recordings.ts
import prisma from './src/shared/lib/db/prisma';

async function linkExistingRecordings() {
  const leadId = '12319766-5879-4019-abfb-d1c181b7b9d4';
  
  // Update all pending calls with a recording URL
  // Note: You'll need to manually match which recording goes to which call
  const recordings = [
    {
      callId: '916819ad-2271-49a7-9031-5ccf749e7b15', // 11:26 AM
      url: 'https://wkwrrdcjknvupwsfdjtd.supabase.co/storage/v1/object/public/recordings/1770789394301_1770789394111_Call%20recording%20Adthi%20E2W_260211_112454.m4a'
    },
    // Add more mappings...
  ];
  
  for (const rec of recordings) {
    await prisma.callLog.update({
      where: { id: rec.callId },
      data: {
        recordingUrl: rec.url,
        recordingStatus: 'available'
      }
    });
  }
  
  console.log('✅ Recordings linked!');
}
```

---

## 📞 SUMMARY

**Why recordings are in Supabase but not LMS:**

1. **No webhook is calling the sync endpoint** - The recording upload happens in isolation
2. **Call Monitor app needs to notify LMS** - Either via Supabase webhook or direct API call
3. **Phone number may not match** - Filename contains different numbers than lead's phone

**Fix by implementing ONE of:**
- ✅ Configure Supabase Storage webhook (automatic, recommended)
- ✅ Update Call Monitor app to POST to webhook (manual, more control)

**Once fixed:**
- Recordings will auto-sync to LMS
- Call logs will show recording player
- Agents can play/download recordings
