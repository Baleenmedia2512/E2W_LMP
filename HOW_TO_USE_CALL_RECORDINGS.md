# 📞 How to Use Call Recordings in LMS

## ✅ System Status: FULLY WORKING

Your call recording system is now **fully integrated and working**! Here's how to use it effectively.

---

## 🎯 Two Ways to Record and Sync Calls

### Method 1: Auto-Matching (Automatic ✨ - RECOMMENDED)

**Now Available!** The system automatically matches calls with leads - no manual logging required!

**How it works:**
1. **Make a call** from your mobile phone to any lead's number
2. **Recording app detects** the call automatically
3. **System searches** for a matching lead in LMS by phone number
4. **Auto-creates call log** and links the recording
5. **Recording appears** in the lead's Call History tab!

**That's it!** Just make calls normally and recordings will appear automatically in LMS.

### Method 2: Pre-Logged Calls (Manual)

**For more control** over call logging:

1. **Go to Lead's page** in LMS
2. **Click "Log Call" button**
3. **Make the actual call** from your mobile (within 3 minutes)
4. **Recording automatically links** to the pre-created call log

---

## 📍 Where to See Recordings

### In LMS:
1. Open any lead's detail page
2. Go to the **"Call History"** tab
3. You'll see all calls with **audio player** for recordings
4. Click **play button** to listen to the recording

### In Recording App:
1. Open the Call Monitor app on your phone
2. All calls are listed with recording indicators
3. Click any call to play the recording

---

## 🔍 Example Workflow

Let's say you want to call **John Doe** (9876543210):

### Using Auto-Matching (Easy Way):
1. ✅ Make sure John Doe exists as a lead in LMS with phone 9876543210
2. ✅ Call him directly from your phone
3. ✅ Recording app records the call
4. ✅ Go to John's lead page in LMS → Call History tab
5. ✅ Recording is already there! 🎉

### Using Pre-Logging (Control Way):
1. Open John Doe's lead page in LMS
2. Click "Log Call" button → Creates pending call log
3. Call him within 3 minutes
4. Recording app matches and links recording
5. Refresh lead page → Recording appears

---

## ⚠️ Troubleshooting

### "Recording uploaded to Supabase but not synced with LMS"

**This message appears when:**
- You called a phone number that **doesn't exist as a lead** in your LMS
- The recording is safely stored in Supabase for 90 days
- You can manually link it later when the number becomes a lead

**Solution:**
1. Add the phone number as a new lead in LMS
2. Make another call to test
3. Or wait for the auto-match next time you call an existing lead

### Recordings Not Showing in LMS

**Checklist:**
- ✅ Is the phone number saved as a lead in LMS?
- ✅ Did you wait 5-10 seconds after call ended?
- ✅ Did you refresh the lead's page?
- ✅ Is the Recording App connected to internet?
- ✅ Check the app shows "✓ Active" status

### Call Not Auto-Matched

**The system matches calls when:**
- ✅ Phone number exists in Lead's phone OR alternatePhone field
- ✅ Recording app has internet connection
- ✅ Call duration is more than 3 seconds

**If auto-match fails:**
- Use Method 2 (Pre-Logged Calls) instead
- Or check if the phone number format matches (last 10 digits)

---

## 🔐 Privacy & Security

- All recordings are **encrypted in transit** and **at rest**
- Only authorized users can access recordings
- Recordings are stored securely in Supabase
- Call logs include timestamps and caller information
- GDPR compliant storage

---

## 📊 Best Practices

1. **Always keep lead phone numbers updated** in LMS
2. **Use both phone and alternatePhone fields** if lead has multiple numbers
3. **Refresh lead page** after making calls to see new recordings
4. **Grant all permissions** to Recording App for best experience
5. **Keep app running in background** during calls

---

## 🆘 Still Having Issues?

### Check Recording App:
- Open Call Monitor app
- Ensure you see "✓ Active" status
- Check permissions are all granted
- Try making a test call to yourself

### Check LMS:
- Verify lead exists with correct phone number
- Check Call History tab after waiting 10 seconds
- Refresh the page if recordings don't appear
- Check browser console for any errors

### Configuration:
- Verify `NEXT_PUBLIC_LMS_URL` is set correctly in Recording App
- Ensure `CALL_MONITOR_API_KEY` matches between LMS and Recording App
- Check Supabase connection in Recording App

---

## ✨ Features

- ✅ **Auto-match calls** with leads by phone number
- ✅ **Auto-create call logs** when calling existing leads
- ✅ **Real-time recording** sync to Supabase
- ✅ **Automatic LMS integration** with recording URLs
- ✅ **Call history tracking** with duration and status
- ✅ **Audio playback** directly in LMS
- ✅ **90-day retention** in Supabase storage
- ✅ **Mobile-friendly** interface
- ✅ **Offline support** with background sync

---

## 📈 System Architecture

```
Phone Call Made
    ↓
Recording App Detects Call
    ↓
Records Audio to Device Storage
    ↓
Call Ends → Upload to Supabase
    ↓
Check LMS for Matching Lead
    ↓
┌─────────────────┬─────────────────┐
│ Lead Found      │ Lead Not Found  │
├─────────────────┼─────────────────┤
│ Auto-create     │ Store in        │
│ Call Log        │ Supabase only   │
│                 │                 │
│ Link Recording  │ (90 days)       │
│                 │                 │
│ Show in LMS ✅  │ Can link later  │
└─────────────────┴─────────────────┘
```

---

## 🎉 Success!

Your call recording system is now fully operational! Happy calling! 📞
