# 🔧 Fix: Voice Recordings Not Playing

## Problem
Voice recordings are not playable in the LMS because the Supabase storage bucket "recordings" doesn't exist.

## Root Cause
- Call logs have `recordingUrl` fields pointing to Supabase storage
- The "recordings" bucket was never created in Supabase
- When the audio player tries to load the file, it gets a 404 error

## Solution: Create Supabase Storage Bucket

### Step 1: Create the Recordings Bucket

1. Go to your **Supabase Dashboard**:
   - URL: https://app.supabase.com/project/wkwrrdcjknvupwsfdjtd
   - Or go to: https://app.supabase.com and select your project

2. Navigate to **Storage** in the left sidebar

3. Click **New Bucket** button

4. Configure the bucket:
   ```
   Name: recordings
   Public bucket: ✅ YES (Enable this!)
   File size limit: 100 MB
   Allowed MIME types: audio/*, video/* (optional)
   ```

5. Click **Create Bucket**

### Step 2: Set Bucket Policies

1. Click on the **"recordings"** bucket you just created

2. Go to the **Policies** tab

3. Click **New Policy** → **For full customization**

4. Add this policy for public read access:

```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'recordings' );
```

Or use the UI:
- Policy name: `Public Read Access`
- Allowed operation: `SELECT`
- Target roles: `public`, `anon`
- USING expression: `bucket_id = 'recordings'`

5. Click **Review** and **Save**

### Step 3: Configure Call Monitor App

Your Call Monitor app needs to upload recordings to this Supabase bucket.

**Option A: If Call Monitor Already Uses Supabase**

Make sure it uploads to the `recordings` bucket with this path structure:
```
recordings/call-recordings/[filename].m4a
```

**Option B: If Call Monitor Uses Google Drive**

You'll need to modify the app to also upload to Supabase, or use a webhook to copy files from Google Drive to Supabase.

### Step 4: Test Upload

Test if uploads work:

1. Create a test audio file (or use any small .m4a file)

2. Use this curl command to test upload:

```bash
curl -X POST \
  'https://wkwrrdcjknvupwsfdjtd.supabase.co/storage/v1/object/recordings/test.m4a' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'apikey: YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: audio/mp4' \
  --data-binary '@test.m4a'
```

3. Test if it's accessible:
```
https://wkwrrdcjknvupwsfdjtd.supabase.co/storage/v1/object/public/recordings/test.m4a
```

---

## Alternative: Use Local/Public Storage

If you don't want to use Supabase storage, you can:

### Option 1: Store in LMS Public Folder

1. Modify Call Monitor app to upload directly to LMS
2. Store files in `public/uploads/recordings/`
3. URL format: `http://your-lms-url/uploads/recordings/[filename].m4a`

### Option 2: Use Google Drive with Direct Links

1. Upload to Google Drive
2. Make files publicly accessible
3. Get direct download link
4. Store that link in `recordingUrl` field

---

## Quick Fix: Update Existing Call Logs

If you already have call logs with incorrect URLs, run this script after setting up the bucket:

```typescript
// fix-recording-urls-after-setup.ts
import prisma from './src/shared/lib/db/prisma';

async function updateRecordingUrls() {
  const callLogs = await prisma.callLog.findMany({
    where: {
      recordingStatus: 'available',
      recordingUrl: { not: null }
    }
  });

  console.log(`Found ${callLogs.length} call logs with recordings`);
  console.log('⚠️ These URLs might not work until files are uploaded to Supabase');
  
  // For now, mark them as pending
  await prisma.callLog.updateMany({
    where: {
      recordingStatus: 'available',
      recordingUrl: { not: null }
    },
    data: {
      recordingStatus: 'pending' // Mark as pending until files are uploaded
    }
  });
  
  console.log('✅ Updated recording status to pending');
}
```

---

## Verification

After completing the setup:

1. **Check Supabase Dashboard**:
   - Storage → recordings bucket should exist
   - Policies → "Public Read Access" should be enabled

2. **Test with Browser**:
   - Open: `https://wkwrrdcjknvupwsfdjtd.supabase.co/storage/v1/object/public/recordings/test.m4a`
   - Should either show 404 (no file) or download/play the file

3. **Make a Test Call**:
   - Call a lead using Call Monitor app
   - Wait for upload to complete
   - Check lead page in LMS
   - Recording should appear and be playable

---

## Need Help?

If you encounter issues:

1. **Bucket creation fails**: Check Supabase dashboard permissions
2. **Upload fails**: Verify API keys in Call Monitor app
3. **Playback fails**: Check browser console for CORS errors
4. **Files upload but don't play**: Verify bucket is marked as "public"

---

## Current Status

✅ LMS is ready to display recordings  
✅ Database schema supports recordings  
✅ Audio player component is working  
❌ **Supabase "recordings" bucket needs to be created**  
❌ **Call Monitor app needs to upload to Supabase**

Once you create the bucket and configure the app, recordings will work automatically!
