# 📱 Call Monitor App - LMS Integration Implementation Guide

## ✅ Prerequisites
- LMS side is complete (database migrated, APIs working)
- You have access to your **original** Call Monitor app source code
- Call Monitor app is built with React Native + Capacitor
- Recording functionality is already working

---

## 📂 Files You Need to Create/Modify

### **New Files to Create:**
1. `src/config/lms.config.ts` - LMS connection configuration
2. `src/services/lmsApi.ts` - API service for LMS communication
3. `.env` - Environment variables

### **Files to Modify:**
4. Your call detection service (likely `src/plugins/CallDetection.ts` or similar)
5. Your recording upload service (likely `src/services/recordingService.ts` or similar)

---

## 🔧 Step-by-Step Implementation

---

## STEP 1: Create LMS Configuration File

**File:** `src/config/lms.config.ts`

```typescript
/**
 * LMS Integration Configuration
 * This file contains all settings for communicating with the Lead Manager System
 */

export const LMS_CONFIG = {
  // Your LMS domain - UPDATE THIS!
  baseUrl: process.env.REACT_APP_LMS_URL || 'http://192.168.1.100:3000', // Use your local IP or domain
  
  // API key for authentication (must match LMS .env)
  apiKey: process.env.REACT_APP_LMS_API_KEY || 'your-secret-key-here-change-this-123456',
  
  // API endpoints
  endpoints: {
    matchCall: '/api/call-monitor/match-call',
    updateRecording: '/api/call-monitor/update-recording',
  },
  
  // Matching settings
  timeWindowMinutes: 3, // Match calls within ±3 minutes
  
  // Enable/disable LMS integration
  enabled: true,
};

export default LMS_CONFIG;
```

**Important:** Replace `http://192.168.1.100:3000` with:
- Your actual LMS domain if deployed: `https://your-lms.com`
- Your local IP if testing: `http://192.168.1.XXX:3000` (find your IP with `ipconfig`)

---

## STEP 2: Create LMS API Service

**File:** `src/services/lmsApi.ts`

```typescript
import LMS_CONFIG from '../config/lms.config';

/**
 * Check if an outgoing call was initiated from LMS
 * @param phoneNumber - The phone number being called (e.g., "9876543210")
 * @param timestamp - When the call started
 * @returns LMS call data if match found, null otherwise
 */
export async function checkLMSCall(
  phoneNumber: string,
  timestamp: Date
): Promise<{
  isLMSCall: boolean;
  callLogId?: string;
  leadId?: string;
  leadName?: string;
  leadPhone?: string;
} | null> {
  // Skip if LMS integration is disabled
  if (!LMS_CONFIG.enabled) {
    console.log('[LMS] Integration disabled');
    return null;
  }

  try {
    console.log('[LMS] Checking if call is from LMS:', phoneNumber);
    
    const response = await fetch(
      `${LMS_CONFIG.baseUrl}${LMS_CONFIG.endpoints.matchCall}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneNumber,
          timestamp: timestamp.toISOString(),
          apiKey: LMS_CONFIG.apiKey,
        }),
        timeout: 5000, // 5 second timeout
      }
    );

    if (!response.ok) {
      console.error('[LMS] Match call API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.isLMSCall) {
      console.log('[LMS] ✅ Match found! Lead:', data.leadName);
      return data;
    } else {
      console.log('[LMS] ℹ️ No match - regular call');
      return null;
    }
  } catch (error) {
    console.error('[LMS] Error checking LMS call:', error);
    return null;
  }
}

/**
 * Send recording URL back to LMS after upload
 * @param callLogId - The LMS CallLog ID from checkLMSCall
 * @param recordingUrl - Public URL of the uploaded recording
 * @param duration - Call duration in seconds
 * @param recordingAppCallId - Optional: Your app's recording ID
 * @returns true if successful, false otherwise
 */
export async function updateLMSRecording(
  callLogId: string,
  recordingUrl: string,
  duration: number,
  recordingAppCallId?: string
): Promise<boolean> {
  if (!LMS_CONFIG.enabled) {
    console.log('[LMS] Integration disabled');
    return false;
  }

  try {
    console.log('[LMS] Updating recording for CallLog:', callLogId);
    
    const response = await fetch(
      `${LMS_CONFIG.baseUrl}${LMS_CONFIG.endpoints.updateRecording}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callLogId,
          recordingUrl,
          duration,
          recordingAppCallId,
          apiKey: LMS_CONFIG.apiKey,
        }),
        timeout: 10000, // 10 second timeout
      }
    );

    if (!response.ok) {
      console.error('[LMS] Update recording API error:', response.status);
      return false;
    }

    const data = await response.json();
    
    if (data.success) {
      console.log('[LMS] ✅ Recording updated successfully!');
      return true;
    } else {
      console.error('[LMS] ❌ Failed to update recording');
      return false;
    }
  } catch (error) {
    console.error('[LMS] Error updating LMS recording:', error);
    return false;
  }
}

/**
 * Test LMS connection
 * Call this on app startup to verify LMS is reachable
 */
export async function testLMSConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${LMS_CONFIG.baseUrl}/api/health`, {
      method: 'GET',
      timeout: 3000,
    });
    
    if (response.ok) {
      console.log('[LMS] ✅ Connection successful');
      return true;
    } else {
      console.log('[LMS] ⚠️ Connection failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('[LMS] ⚠️ Cannot reach LMS:', error);
    return false;
  }
}
```

---

## STEP 3: Create Environment Variables

**File:** `.env` (create in root of Call Monitor app)

```env
# LMS Integration Settings
REACT_APP_LMS_URL=http://192.168.1.100:3000
REACT_APP_LMS_API_KEY=your-secret-key-here-change-this-123456

# Update the URL above:
# - For local testing: http://YOUR_COMPUTER_IP:3000
# - For production: https://your-lms-domain.com
```

**⚠️ Important:** 
- Replace `192.168.1.100` with your computer's actual IP address
- Find your IP: Run `ipconfig` in Windows Command Prompt, look for "IPv4 Address"
- API key must match the one in your LMS `.env` file

---

## STEP 4: Modify Call Detection Service

**Find your call detection file** (likely one of these):
- `src/plugins/CallDetection.ts`
- `src/services/callDetection.ts`
- `src/hooks/useCallDetection.ts`
- Check `android/app/src/main/java/*/CallDetectionPlugin.java`

**Add this code when outgoing call is detected:**

```typescript
import { checkLMSCall } from '../services/lmsApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your existing call detection code...

async function onOutgoingCallDetected(phoneNumber: string, callStartTime: Date) {
  console.log('📞 Outgoing call detected:', phoneNumber);
  
  // Normalize phone number (remove spaces, dashes, +)
  const normalizedPhone = phoneNumber.replace(/[\s\-\(\)\+]/g, '');
  
  // === NEW: Check if this call is from LMS ===
  try {
    const lmsCallData = await checkLMSCall(normalizedPhone, callStartTime);
    
    if (lmsCallData && lmsCallData.isLMSCall) {
      console.log('✅ LMS call detected!');
      console.log('   Lead:', lmsCallData.leadName);
      console.log('   Phone:', lmsCallData.leadPhone);
      
      // Store LMS call info for later use when recording is uploaded
      await AsyncStorage.setItem('current_lms_call', JSON.stringify({
        callLogId: lmsCallData.callLogId,
        leadId: lmsCallData.leadId,
        leadName: lmsCallData.leadName,
        phoneNumber: normalizedPhone,
        startTime: callStartTime.toISOString(),
        timestamp: Date.now(),
      }));
      
      console.log('✅ LMS call info saved locally');
    } else {
      console.log('ℹ️ Regular call (not from LMS)');
      
      // Clean up any old LMS call data
      await AsyncStorage.removeItem('current_lms_call');
    }
  } catch (error) {
    console.error('❌ Error checking LMS call:', error);
  }
  
  // Continue with your existing recording logic...
  // startRecording();
  // etc.
}
```

**Integration Points:**
- Call this function when you detect an outgoing call
- It runs **before** or **at the start** of recording
- It doesn't block your existing recording logic

---

## STEP 5: Setup Google Drive Upload for Recordings

Your recordings are currently saved **only on phone storage**. To make them accessible to LMS, you need to upload them to Google Drive and get shareable links.

### **5.1: Setup Google Drive API**

**File:** `src/config/googleDrive.config.ts` (create new)

```typescript
export const GOOGLE_DRIVE_CONFIG = {
  // Get these from Google Cloud Console
  clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
  apiKey: process.env.REACT_APP_GOOGLE_API_KEY || '',
  
  // Google Drive folder for recordings
  folderName: 'Call_Recordings',
  
  // Scopes needed
  scopes: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.appdata',
  ],
};
```

### **5.2: Get Google Drive API Credentials**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable **Google Drive API**
4. Create credentials:
   - OAuth 2.0 Client ID (for Android)
   - API Key
5. Add credentials to `.env`:

```env
REACT_APP_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
REACT_APP_GOOGLE_API_KEY=your-api-key-here
```

### **5.3: Install Google Drive Package**

Your `recordingapp -ramesh` already has Google Drive setup! Check:
- `GOOGLE_DRIVE_SETUP.md`
- `GOOGLE_DRIVE_IMPLEMENTATION.md`
- `src/services/googleDriveService.ts` (likely already exists)

If not installed, run:
```bash
npm install @react-native-google-signin/google-signin
npm install react-native-fs
```

### **5.4: Create Google Drive Upload Service**

**File:** `src/services/googleDriveUpload.ts` (create new or update existing)

```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import RNFS from 'react-native-fs';

// Configure Google Sign-In
GoogleSignin.configure({
  scopes: ['https://www.googleapis.com/auth/drive.file'],
  webClientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
  offlineAccess: true,
});

/**
 * Upload recording file to Google Drive
 * @param localFilePath - Path to recording on phone
 * @param fileName - Name for the file
 * @returns Google Drive file ID and shareable link
 */
export async function uploadRecordingToDrive(
  localFilePath: string,
  fileName: string
): Promise<{ fileId: string; webViewLink: string } | null> {
  try {
    console.log('📤 Starting Google Drive upload...');
    
    // 1. Check if user is signed in
    const isSignedIn = await GoogleSignin.isSignedIn();
    if (!isSignedIn) {
      console.log('🔐 Signing in to Google...');
      await GoogleSignin.signIn();
    }
    
    // 2. Get access token
    const tokens = await GoogleSignin.getTokens();
    const accessToken = tokens.accessToken;
    
    // 3. Read file from phone storage
    const fileContent = await RNFS.readFile(localFilePath, 'base64');
    
    // 4. Create metadata
    const metadata = {
      name: fileName,
      mimeType: 'audio/mpeg', // or 'audio/m4a' depending on format
    };
    
    // 5. Upload to Google Drive
    const formData = new FormData();
    formData.append('metadata', {
      string: JSON.stringify(metadata),
      type: 'application/json',
    });
    formData.append('file', {
      uri: localFilePath,
      type: 'audio/mpeg',
      name: fileName,
    });
    
    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'multipart/related',
        },
        body: formData,
      }
    );
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }
    
    const uploadData = await uploadResponse.json();
    const fileId = uploadData.id;
    
    console.log('✅ File uploaded to Drive:', fileId);
    
    // 6. Make file publicly accessible (anyone with link can view)
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
        }),
      }
    );
    
    // 7. Get shareable link
    const fileResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink,webContentLink`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    const fileData = await fileResponse.json();
    
    console.log('✅ Shareable link created:', fileData.webContentLink);
    
    return {
      fileId: fileId,
      webViewLink: fileData.webContentLink || fileData.webViewLink,
    };
    
  } catch (error) {
    console.error('❌ Google Drive upload failed:', error);
    return null;
  }
}

/**
 * Get direct download/play link for audio file
 */
export function getDirectPlayLink(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}
```

### **5.5: Integrate Upload in Recording Flow**

**Update your recording service to include Google Drive upload:**

```typescript
import { uploadRecordingToDrive, getDirectPlayLink } from './googleDriveUpload';

async function onRecordingComplete(localFilePath: string, duration: number) {
  console.log('🎙️ Recording complete:', localFilePath);
  
  // 1. Save locally (you already do this)
  await saveToLocalDatabase(localFilePath);
  
  // 2. Generate filename
  const timestamp = Date.now();
  const fileName = `call_recording_${timestamp}.m4a`;
  
  // 3. Upload to Google Drive
  console.log('📤 Uploading to Google Drive...');
  const driveUpload = await uploadRecordingToDrive(localFilePath, fileName);
  
  if (driveUpload) {
    console.log('✅ Uploaded to Drive!');
    
    // 4. Get direct play link
    const recordingUrl = getDirectPlayLink(driveUpload.fileId);
    console.log('🔗 Recording URL:', recordingUrl);
    
    // 5. Continue to Step 6 - send URL to LMS
    await onRecordingUploaded(localFilePath, recordingUrl, duration, driveUpload.fileId);
    
  } else {
    console.error('❌ Drive upload failed - recording only saved locally');
  }
}
```

---

## STEP 6: Send Recording URL to LMS

After Google Drive upload completes, send the recording URL to LMS:

**File:** Your recording service (already modified in Step 5.5)

```typescript
import { updateLMSRecording } from '../services/lmsApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function onRecordingUploaded(
  localFilePath: string,
  recordingUrl: string, // Google Drive direct play link
  duration: number,
  recordingId: string // Google Drive file ID
) {
  console.log('📤 Recording URL ready:', recordingUrl);
  
  // === Send recording to LMS if this was an LMS call ===
  try {
    const lmsCallDataStr = await AsyncStorage.getItem('current_lms_call');
    
    if (lmsCallDataStr) {
      const lmsCallData = JSON.parse(lmsCallDataStr);
      console.log('📨 Sending recording to LMS...');
      console.log('   CallLog ID:', lmsCallData.callLogId);
      console.log('   Lead:', lmsCallData.leadName);
      console.log('   Recording URL:', recordingUrl);
      
      // Send recording URL to LMS
      const success = await updateLMSRecording(
        lmsCallData.callLogId,
        recordingUrl,
        duration,
        recordingId // Google Drive file ID
      );
      
      if (success) {
        console.log('✅ LMS updated with recording URL!');
        console.log('   Sales team can now listen to this call');
        
        // Clean up after successful update
        await AsyncStorage.removeItem('current_lms_call');
      } else {
        console.error('❌ Failed to update LMS - will retry later');
        // Keep the data in AsyncStorage for retry logic (optional)
      }
    } else {
      console.log('ℹ️ Not an LMS call - recording saved to Drive only');
    }
  } catch (error) {
    console.error('❌ Error updating LMS recording:', error);
  }
}
```

**Integration Points:**
- Called automatically after Google Drive upload (Step 5.5)
- Sends shareable Google Drive link to LMS
- LMS can now play the recording in browser

---

## STEP 7: Optional - Test Connection on App Start

**Add to your main app file** (`App.tsx` or `index.tsx`):

```typescript
import { useEffect } from 'react';
import { testLMSConnection } from './services/lmsApi';

function App() {
  useEffect(() => {
    // Test LMS connection on app startup
    testLMSConnection().then((connected) => {
      if (connected) {
        console.log('✅ LMS integration ready');
      } else {
        console.log('⚠️ LMS not reachable - app will work in standalone mode');
      }
    });
  }, []);
  
  // Your existing app code...
}
```

---

## 📦 STEP 8: Install Required Dependencies

If you don't have these packages, install them:

```bash
npm install @react-native-async-storage/async-storage
npm install @react-native-google-signin/google-signin
npm install react-native-fs
```

Or with yarn:

```bash
yarn add @react-native-async-storage/async-storage @react-native-google-signin/google-signin react-native-fs
```

---

## 🔨 STEP 9: Build New APK

### **For Development Build:**
```bash
npm run build
npx cap sync
npx cap open android
```

Then in Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

### **For Production Build:**
```bash
npm run build
npx cap sync android
cd android
./gradlew assembleRelease
```

APK will be in: `android/app/build/outputs/apk/release/app-release.apk`

---

## 🧪 STEP 10: Testing Checklist

### **Pre-Testing Setup:**
1. ✅ Get your computer's IP address (`ipconfig`)
2. ✅ Update `.env` with correct LMS URL
3. ✅ Ensure phone and computer on same WiFi
4. ✅ LMS server is running (`npm run dev`)
5. ✅ Install new APK on test phone

### **Test Flow:**

#### **Test 1: Connection Test**
```
1. Open Call Monitor app
2. Check logs (use React Native debugger or adb logcat)
3. Look for: "✅ LMS integration ready"
4. If you see "⚠️ LMS not reachable":
   - Check IP address
   - Check if LMS is running
   - Ensure same WiFi network
```

#### **Test 2: Call Detection**
```
1. Open LMS web app
2. Click "Call Now" on any lead (e.g., Ramesh - 9876543210)
3. Phone dialer opens
4. In Call Monitor app logs, look for:
   "✅ LMS call detected!"
   "Lead: Ramesh"
5. Make the call (or just dial and hang up)
6. Record the call if user clicks record
```

#### **Test 3: Recording Upload**
```
1. End the call
2. Recording processes and uploads
3. In Call Monitor logs, look for:
   "📨 Sending recording to LMS..."
   "✅ LMS updated with recording URL!"
4. Open LMS → Leads → Click on Ramesh
5. Go to "Call Logs" tab
6. You should see the call with a recording player
7. Click play button - audio should play! 🎵
```

#### **Test 4: Regular Call (Not from LMS)**
```
1. Make a regular call directly from phone dialer
2. In Call Monitor logs, look for:
   "ℹ️ Regular call (not from LMS)"
3. Recording still works and saves locally
4. But doesn't send to LMS
```

---

## 🐛 Troubleshooting

### **Problem: "Cannot reach LMS" / Connection Failed**

**Solutions:**
1. Check IP address is correct in `.env`
2. Verify LMS is running: Open `http://YOUR_IP:3000` in phone browser
3. Ensure phone and computer on **same WiFi**
4. Check firewall - Windows may block incoming connections
5. Try using `0.0.0.0` instead of `localhost` when starting LMS:
   ```bash
   npm run dev -- -H 0.0.0.0
   ```

### **Problem: "No match - regular call" for LMS calls**

**Possible Causes:**
1. **Time sync issue** - Phone time and computer time don't match
   - Solution: Sync both devices with internet time
2. **Phone number format mismatch**
   - Check: LMS saved `9876543210`
   - Check: Call Monitor sent `+919876543210` or `98765 43210`
   - Solution: Both should remove all non-digits
3. **Call too slow** - More than 3 minutes between "Call Now" click and actual dial
   - Solution: Dial faster, or increase `timeWindowMinutes` in config

### **Problem: Recording not showing in LMS**

**Check:**
1. Recording URL is publicly accessible
   - Try opening URL in browser
2. Call Monitor logs show "✅ LMS updated"
3. Database check:
   ```sql
   SELECT id, phoneDialed, recordingStatus, recordingUrl 
   FROM "CallLog" 
   ORDER BY "createdAt" DESC 
   LIMIT 5;
   ```
4. recordingStatus should be `"available"`, not `"pending"`

### **Problem: APK build fails**

**Common fixes:**
```bash
# Clear cache and rebuild
cd android
./gradlew clean
cd ..
npx cap sync
```

---

## 📱 Device Permissions

Ensure these permissions are in your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
<uses-permission android:name="android.permission.READ_CALL_LOG" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

---

## 🔐 Security Notes

1. **Use HTTPS in production** - Don't use `http://` for production LMS
2. **Keep API key secret** - Never commit `.env` to git
3. **Add `.env` to `.gitignore`**:
   ```
   .env
   .env.local
   ```

---

## 📊 Complete Integration Summary

### **What Happens:**

```
User clicks "Call Now" in LMS
    ⬇️
LMS saves: "Calling 9876543210 at 14:30:00"
    ⬇️
Phone dialer opens
    ⬇️
Call Monitor detects call
    ⬇️
Calls checkLMSCall(9876543210, 14:30:15) ← 15 seconds later
    ⬇️
LMS matches by phone + time (within 3 min window)
    ⬇️
LMS returns: "Yes! CallLog ABC123, Lead: Ramesh"
    ⬇️
Call Monitor saves to AsyncStorage
    ⬇️
Call happens, recording starts
    ⬇️
Call ends, you upload recording to Supabase
    ⬇️
Get URL: https://storage.supabase.com/rec123.m4a
    ⬇️
Call updateLMSRecording(ABC123, url, duration)
    ⬇️
LMS updates database: recordingUrl = url
    ⬇️
User opens LMS call logs
    ⬇️
Recording player appears with play button
    ⬇️
Click play → Listen to conversation! 🎵
```

---

## ✅ Final Checklist

- [ ] Created `src/config/lms.config.ts`
- [ ] Created `src/services/lmsApi.ts`
- [ ] Created `.env` with correct LMS URL and API key
- [ ] Setup Google Drive API credentials
- [ ] Created `src/config/googleDrive.config.ts`
- [ ] Created `src/services/googleDriveUpload.ts`
- [ ] Modified call detection to call `checkLMSCall()`
- [ ] Modified recording service to upload to Google Drive
- [ ] Modified recording upload to call `updateLMSRecording()`
- [ ] Installed required packages (AsyncStorage, Google Sign-In, RNFS)
- [ ] Built new APK
- [ ] Installed APK on test device
- [ ] Tested: LMS connection works
- [ ] Tested: Google Sign-In works
- [ ] Tested: Click "Call Now" → Call Monitor detects it
- [ ] Tested: Recording uploads to Google Drive
- [ ] Tested: Recording appears in LMS with play button
- [ ] Tested: Can play recording in LMS

---

## 🎉 Success Criteria

**You'll know it's working when:**
1. ✅ Click "Call Now" in LMS
2. ✅ Make call from phone
3. ✅ Recording happens
4. ✅ Open LMS call logs
5. ✅ See play button next to call
6. ✅ Click play → Hear conversation

**That's it! Both apps are now integrated!** 🚀

---

## 📞 Need Help?

**Common Issues:**
- Network connection problems → Check IP and WiFi
- Timing issues → Check phone/computer time sync
- Recording not showing → Check logs and database
- Build issues → Clean and rebuild

**Debug Logs to Watch:**
- `[LMS] Checking if call is from LMS`
- `✅ LMS call detected!`
- `✅ LMS updated with recording URL!`

---

**Good luck! You've got this! 💪**
