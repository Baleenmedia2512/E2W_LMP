# Recording Playback Issue - Summary

## Problem
Voice recordings were not playing in the LMS leads view page.

## Root Cause
The **Supabase "recordings" storage bucket doesn't exist**. The system was creating call logs with recording URLs pointing to:
```
https://wkwrrdcjknvupwsfdjtd.supabase.co/storage/v1/object/public/recordings/...
```
But the "recordings" bucket was never created in Supabase, so all files return 404 errors.

## What Was Fixed

### 1. Improved Audio Player Component
- Added error detection when audio files fail to load
- Shows clear "Recording unavailable" message with warning icon
- Provides helpful tooltip explaining the issue
- Allows trying to open the URL in a new tab

### 2. Fixed URL Encoding
- Updated webhook to properly encode filenames with spaces
- Fixed existing recordings in database to use URL-encoded paths

### 3. Created Documentation
- [FIX_RECORDING_PLAYBACK.md](./FIX_RECORDING_PLAYBACK.md) - Complete setup guide

## What You Need to Do

### Immediate Action Required:

1. **Create Supabase Storage Bucket**:
   - Go to https://app.supabase.com/project/wkwrrdcjknvupwsfdjtd/storage
   - Click "New Bucket"
   - Name: `recordings`
   - Enable "Public bucket" checkbox
   - Create bucket

2. **Set Public Access Policy**:
   ```sql
   CREATE POLICY "Public Access"
   ON storage.objects FOR SELECT
   USING ( bucket_id = 'recordings' );
   ```

3. **Configure Call Monitor App**:
   - Ensure it uploads recordings to Supabase
   - Upload path: `recordings/call-recordings/[filename].m4a`

### Testing After Setup:

1. **Make a test call** using Call Monitor app
2. **Check if file uploads** to Supabase storage
3. **Open lead page** in LMS
4. **Recording should play** in the Call Logs tab

## Current Behavior

### Before Fix:
- Audio player shows play button
- Clicking play does nothing
- No error message
- User has no idea what's wrong

### After Fix:
- Audio player detects file is inaccessible
- Shows warning: "⚠️ Recording unavailable"
- Tooltip explains the issue
- Download button still works (opens URL in browser)

## Files Changed

1. **CallRecordingPlayer.tsx** - Added error handling and better UI feedback
2. **route.ts** (webhook) - Fixed URL encoding for filenames with spaces
3. **FIX_RECORDING_PLAYBACK.md** - Complete setup instructions

## Technical Details

**Diagnosis Tools Created:**
- `check-supabase-storage.js` - Checks if bucket exists
- `test-recording-access.ts` - Tests if URLs are accessible
- `fix-recording-urls.ts` - Fixes URL encoding in database

**API Response:**
```json
{
  "statusCode": "404",
  "error": "Bucket not found", 
  "message": "Bucket not found"
}
```

**Solution:**
Create the bucket and configure it as public so audio files can be accessed by the browser.

---

## Next Steps

1. ✅ Create Supabase bucket (5 minutes)
2. ✅ Set bucket to public (1 minute)
3. ✅ Test with a call recording
4. ✅ Verify playback works

Once the bucket is created, all recordings will work automatically!
