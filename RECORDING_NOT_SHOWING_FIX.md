# 🔧 Fix: Recordings Not Showing in LMS Call Logs

## Problem
Recordings are uploaded to Supabase but don't appear in LMS call logs because the Call Monitor app isn't notifying the LMS with recording URLs.

## Solution Steps

### Step 1: Configure Environment Variables

1. Navigate to `recordingapp -ramesh` folder
2. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

3. Edit `.env.local` and set these values:
   ```env
   # Your LMS URL (use your computer's local IP, NOT localhost)
   NEXT_PUBLIC_LMS_URL=http://192.168.1.35:3000
   
   # Must match the CALL_MONITOR_API_KEY in main LMS .env
   NEXT_PUBLIC_LMS_API_KEY=your-secret-key-here-change-this-123456
   ```

4. **Find your local IP address:**
   - Windows: Open Command Prompt and run `ipconfig`
   - Look for "IPv4 Address" under your WiFi adapter
   - Example: `192.168.1.35`
   - Update `NEXT_PUBLIC_LMS_URL` with your IP

### Step 2: Update LMS Environment

1. Open your main LMS `.env` file (in `c:\xampp\htdocs\E2W_LMP`)
2. Add or verify this line:
   ```env
   CALL_MONITOR_API_KEY=your-secret-key-here-change-this-123456
   ```
3. **Important:** The API key must match in both apps!

### Step 3: Integrate with Recording Upload Flow

You need to modify your recording upload code to notify the LMS. Here's where to add it:

**Option A: If you're using Google Drive upload**

Find your Google Drive upload hook or service and add this:

```typescript
import { checkLMSCall, updateLMSRecording } from '@/services/lmsApi';

// After successful recording upload to Google Drive
async function onRecordingUploaded(recordingUrl: string, duration: number, phoneNumber: string, callStartTime: Date) {
  // Check if this was an LMS call
  const lmsCall = await checkLMSCall(phoneNumber, callStartTime);
  
  if (lmsCall && lmsCall.callLogId) {
    // Send recording URL to LMS
    await updateLMSRecording(
      lmsCall.callLogId,
      recordingUrl,
      duration
    );
  }
}
```

**Option B: If you're using Supabase Storage**

Find your Supabase upload code and add:

```typescript
import { checkLMSCall, updateLMSRecording } from '@/services/lmsApi';
import { supabase } from '@/lib/supabase';

// After uploading to Supabase Storage
async function uploadRecordingToSupabase(filePath: string, phoneNumber: string, callStartTime: Date, duration: number) {
  // Upload to Supabase
  const fileName = `recording-${Date.now()}.m4a`;
  const { data, error } = await supabase.storage
    .from('call-recordings')
    .upload(fileName, fileBlob, { upsert: true });
  
  if (error) throw error;
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('call-recordings')
    .getPublicUrl(fileName);
    
  const recordingUrl = urlData.publicUrl;
  
  // ✅ NEW: Check if LMS call and update
  const lmsCall = await checkLMSCall(phoneNumber, callStartTime);
  if (lmsCall && lmsCall.callLogId) {
    await updateLMSRecording(lmsCall.callLogId, recordingUrl, duration);
  }
  
  return recordingUrl;
}
```

### Step 4: Update Call Detection (When Call Starts)

Find where your app detects outgoing calls and add LMS check:

```typescript
import { checkLMSCall } from '@/services/lmsApi';

// When outgoing call is detected
async function onOutgoingCallDetected(phoneNumber: string) {
  const callStartTime = new Date();
  
  // Check if this is an LMS call
  const lmsCall = await checkLMSCall(phoneNumber, callStartTime);
  
  if (lmsCall) {
    console.log('✅ LMS call detected for lead:', lmsCall.leadName);
    // Store this info to use later when recording uploads
    await AsyncStorage.setItem('current_lms_call', JSON.stringify({
      callLogId: lmsCall.callLogId,
      leadId: lmsCall.leadId,
      phoneNumber,
      startTime: callStartTime.toISOString(),
    }));
  }
}

// When recording uploads
async function onRecordingUploaded(recordingUrl: string, duration: number) {
  const lmsCallStr = await AsyncStorage.getItem('current_lms_call');
  if (lmsCallStr) {
    const lmsCall = JSON.parse(lmsCallStr);
    await updateLMSRecording(lmsCall.callLogId, recordingUrl, duration);
    await AsyncStorage.removeItem('current_lms_call');
  }
}
```

### Step 5: Test the Connection

Add this test to your app's startup or settings:

```typescript
import { testLMSConnection } from '@/services/lmsApi';

// On app startup or in settings screen
async function testConnection() {
  const connected = await testLMSConnection();
  if (connected) {
    alert('✅ LMS connection successful!');
  } else {
    alert('❌ Cannot reach LMS. Check your WiFi and LMS URL in .env.local');
  }
}
```

### Step 6: Testing the Complete Flow

1. **Start LMS server** (must be running on port 3000)
2. **Open LMS** in browser
3. **Go to a lead** and click "Call Now"
4. **Phone dialer opens** with the number
5. **Make the call** from your phone
6. **Check Recording App logs** - should see:
   ```
   [LMS] Checking if call is from LMS...
   [LMS] ✅ LMS call detected!
   ```
7. **End call** and wait for upload
8. **Check logs again** - should see:
   ```
   [LMS] Updating recording...
   [LMS] ✅ Recording updated successfully!
   ```
9. **Refresh LMS lead page**
10. **Call log should show play button** ▶️

## Troubleshooting

### ❌ "Cannot reach LMS"

**Check:**
- Is LMS server running? (`npm run dev`)
- Both devices on same WiFi?
- Firewall blocking port 3000?
- Using correct local IP (not localhost)?

**Test:** Open `http://YOUR_IP:3000` in phone browser - should load LMS

### ❌ "LMS call not detected"

**Check:**
- Time sync: Is phone time = computer time?
- Phone number format: LMS saves without spaces/dashes
- Call timing: Must check within ±3 minutes of "Call Now" click

**Debug:** Check LMS database:
```sql
SELECT id, phoneDialed, startedAt, recordingStatus 
FROM "CallLog" 
ORDER BY "createdAt" DESC 
LIMIT 5;
```

### ❌ "Recording URL not updating"

**Check:**
- API key matches in both .env files?
- Recording URL is publicly accessible? (try opening in browser)
- Check LMS server logs for errors

**Debug:** Check network requests in Recording App logs

### ❌ "Recording shows but won't play"

**Check:**
- Is URL publicly accessible?
- CORS headers configured?
- File format supported? (m4a, mp3, wav)

## Quick Checklist

- [ ] Created `.env.local` in recording app
- [ ] Set `NEXT_PUBLIC_LMS_URL` with local IP  
- [ ] Set `NEXT_PUBLIC_LMS_API_KEY` matching LMS
- [ ] Added `CALL_MONITOR_API_KEY` to LMS `.env`
- [ ] Integrated `checkLMSCall()` in call detection
- [ ] Integrated `updateLMSRecording()` in upload flow
- [ ] Tested LMS connection
- [ ] Both devices on same WiFi
- [ ] LMS server running
- [ ] Made test call from LMS
- [ ] Recording appears in call logs with play button

## Need More Help?

Check these files for examples:
- `src/config/lms.config.ts` - Configuration
- `src/services/lmsApi.ts` - API functions
- LMS: `src/app/api/call-monitor/match-call/route.ts`
- LMS: `src/app/api/call-monitor/update-recording/route.ts`
