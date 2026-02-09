# Call Monitor App Integration Instructions

## 📱 Overview
These instructions will help you integrate the Call Monitor mobile app with your LMS to automatically link call recordings to leads.

---

## 🔧 Part 1: LMS Setup (COMPLETED ✅)

The following changes have been made to your LMS:

1. ✅ **Database Schema Updated** - Added optional fields for call recording tracking
2. ✅ **API Endpoints Created** - Two new endpoints for Call Monitor communication
3. ✅ **UI Updated** - Call logs now show recording player
4. ✅ **Call Tracking Enhanced** - Phone numbers saved for matching

---

## 📝 Part 2: Environment Variables

Add these to your LMS `.env` file:

```env
# Optional: API key for Call Monitor app security
CALL_MONITOR_API_KEY=your-secret-key-here-change-this-123456
```

---

## 🗄️ Part 3: Database Migration

Run Prisma migration to apply schema changes:

```bash
npx prisma generate
npx prisma db push
```

Or create a migration:

```bash
npx prisma migrate dev --name add-call-recording-fields
```

---

## 📱 Part 4: Call Monitor App Changes

### Step 1: Add LMS Configuration

In your Call Monitor app, create or update the LMS configuration file:

**File: `src/config/lms.config.ts`** (create new)

```typescript
export const LMS_CONFIG = {
  // Your LMS domain (update this to your actual domain)
  baseUrl: process.env.NEXT_PUBLIC_LMS_URL || 'http://localhost:3000',
  
  // API key for authentication (must match .env in LMS)
  apiKey: process.env.NEXT_PUBLIC_LMS_API_KEY || 'your-secret-key-here-change-this-123456',
  
  // API endpoints
  endpoints: {
    matchCall: '/api/call-monitor/match-call',
    updateRecording: '/api/call-monitor/update-recording',
  },
};
```

---

### Step 2: Create LMS API Service

**File: `src/services/lmsApi.ts`** (create new)

```typescript
import { LMS_CONFIG } from '@/config/lms.config';

/**
 * Check if an outgoing call was initiated from LMS
 */
export async function checkLMSCall(phoneNumber: string, timestamp: Date) {
  try {
    const response = await fetch(
      `${LMS_CONFIG.baseUrl}${LMS_CONFIG.endpoints.matchCall}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': LMS_CONFIG.apiKey,
        },
        body: JSON.stringify({
          phone: phoneNumber,
          timestamp: timestamp.toISOString(),
          apiKey: LMS_CONFIG.apiKey,
        }),
      }
    );

    if (!response.ok) {
      console.error('LMS match-call API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.isLMSCall ? data : null;
  } catch (error) {
    console.error('Error checking LMS call:', error);
    return null;
  }
}

/**
 * Send recording URL back to LMS after upload
 */
export async function updateLMSRecording(
  callLogId: string,
  recordingUrl: string,
  duration: number,
  recordingAppCallId?: string
) {
  try {
    const response = await fetch(
      `${LMS_CONFIG.baseUrl}${LMS_CONFIG.endpoints.updateRecording}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': LMS_CONFIG.apiKey,
        },
        body: JSON.stringify({
          callLogId,
          recordingUrl,
          duration,
          recordingAppCallId,
          apiKey: LMS_CONFIG.apiKey,
        }),
      }
    );

    if (!response.ok) {
      console.error('LMS update-recording API error:', response.status);
      return false;
    }

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error updating LMS recording:', error);
    return false;
  }
}
```

---

### Step 3: Update Call Detection Service

Find your call detection service (likely in `src/services/callDetection.ts` or similar) and integrate LMS checking:

```typescript
import { checkLMSCall, updateLMSRecording } from './lmsApi';

// When outgoing call is detected
async function onOutgoingCallDetected(phoneNumber: string, callStartTime: Date) {
  console.log('📞 Outgoing call detected:', phoneNumber);
  
  // Check if this call is from LMS
  const lmsCallData = await checkLMSCall(phoneNumber, callStartTime);
  
  if (lmsCallData) {
    console.log('✅ LMS call detected for lead:', lmsCallData.leadName);
    
    // Store LMS call info for later use
    await AsyncStorage.setItem('current_lms_call', JSON.stringify({
      callLogId: lmsCallData.callLogId,
      leadId: lmsCallData.leadId,
      leadName: lmsCallData.leadName,
      phoneNumber: phoneNumber,
      startTime: callStartTime.toISOString(),
    }));
    
    // Start recording if user has enabled it
    // Your existing recording logic here...
  } else {
    console.log('ℹ️ Regular call (not from LMS)');
  }
}
```

---

### Step 4: Update Recording Upload Service

After recording is uploaded to storage, send the URL to LMS:

```typescript
import { updateLMSRecording } from './lmsApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function onRecordingUploaded(
  localFilePath: string,
  recordingUrl: string,
  duration: number,
  recordingId: string
) {
  console.log('📤 Recording uploaded:', recordingUrl);
  
  // Check if this was an LMS call
  const lmsCallDataStr = await AsyncStorage.getItem('current_lms_call');
  
  if (lmsCallDataStr) {
    const lmsCallData = JSON.parse(lmsCallDataStr);
    
    // Send recording URL to LMS
    const success = await updateLMSRecording(
      lmsCallData.callLogId,
      recordingUrl,
      duration,
      recordingId
    );
    
    if (success) {
      console.log('✅ LMS updated with recording URL');
      
      // Clean up
      await AsyncStorage.removeItem('current_lms_call');
    } else {
      console.error('❌ Failed to update LMS with recording');
    }
  }
}
```

---

### Step 5: Add Environment Variables to Call Monitor App

Create `.env` file in your Call Monitor app:

```env
# LMS Integration
NEXT_PUBLIC_LMS_URL=https://your-lms-domain.com
NEXT_PUBLIC_LMS_API_KEY=your-secret-key-here-change-this-123456
```

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│ 1. LMS: User clicks "Call Now" (Lead: Ramesh)      │
│    → Saves call log with phone number              │
│    → Opens phone dialer                             │
└─────────────────────────────────────────────────────┘
                      ⬇️
┌─────────────────────────────────────────────────────┐
│ 2. Call Monitor: Detects outgoing call             │
│    → Calls checkLMSCall(phone, timestamp)          │
│    → LMS API returns: callLogId, leadName          │
│    → Stores LMS call info locally                   │
│    → Starts recording                               │
└─────────────────────────────────────────────────────┘
                      ⬇️
┌─────────────────────────────────────────────────────┐
│ 3. Call Monitor: Call ends                         │
│    → Recording saved locally                        │
│    → Upload to cloud storage (Supabase/S3)         │
│    → Get recording URL                              │
└─────────────────────────────────────────────────────┘
                      ⬇️
┌─────────────────────────────────────────────────────┐
│ 4. Call Monitor: Send recording to LMS             │
│    → Calls updateLMSRecording(callLogId, url)      │
│    → LMS updates CallLog with recording URL        │
│    → Clean up local LMS call data                   │
└─────────────────────────────────────────────────────┘
                      ⬇️
┌─────────────────────────────────────────────────────┐
│ 5. LMS: User views call logs                       │
│    → Sees call to Ramesh                            │
│    → Recording player appears                       │
│    → Clicks play → Listens to conversation! ✅      │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 Testing Checklist

### LMS Testing:
- [ ] Run database migration
- [ ] Restart LMS server
- [ ] Click "Call Now" on a lead
- [ ] Check browser console for any errors
- [ ] Verify call log is created in database

### Call Monitor App Testing:
- [ ] Add LMS configuration
- [ ] Build new APK
- [ ] Install on test device
- [ ] Click "Call Now" in LMS
- [ ] Make call from Call Monitor app
- [ ] Check app logs for "LMS call detected"
- [ ] End call and record
- [ ] Check app logs for "LMS updated with recording URL"
- [ ] Open LMS call logs
- [ ] Verify recording player appears
- [ ] Click play button and listen

---

## 🐛 Troubleshooting

### Recording Not Showing in LMS:

1. **Check API connectivity:**
   ```typescript
   // In Call Monitor app console
   console.log('LMS URL:', LMS_CONFIG.baseUrl);
   ```

2. **Verify API key matches:**
   - LMS `.env`: `CALL_MONITOR_API_KEY=xxx`
   - Call Monitor `.env`: `NEXT_PUBLIC_LMS_API_KEY=xxx`

3. **Check timing:**
   - Call must be matched within ±3 minutes window
   - Ensure device time is correct

4. **Check phone number format:**
   - LMS saves: `9876543210` (no spaces/dashes)
   - Call Monitor sends same format

5. **Check database:**
   ```sql
   SELECT id, phoneDialed, recordingStatus, recordingUrl 
   FROM "CallLog" 
   ORDER BY "createdAt" DESC 
   LIMIT 5;
   ```

---

## 📚 Additional Resources

- **API Endpoints:**
  - Match Call: `POST /api/call-monitor/match-call`
  - Update Recording: `POST /api/call-monitor/update-recording`

- **Database Fields:**
  - `phoneDialed`: Normalized phone number for matching
  - `recordingUrl`: URL of uploaded recording
  - `recordingStatus`: `pending` | `available` | `no_recording`
  - `recordingAppCallId`: Optional reference ID from Call Monitor

---

## ✅ Next Steps

1. Add environment variables to LMS
2. Run database migration
3. Implement Call Monitor app changes above
4. Build and install new APK
5. Test the complete flow
6. Monitor logs for any issues

---

**Need help? Check the troubleshooting section or review the code in:**
- `src/app/api/call-monitor/match-call/route.ts`
- `src/app/api/call-monitor/update-recording/route.ts`
- `src/shared/components/CallRecordingPlayer.tsx`
