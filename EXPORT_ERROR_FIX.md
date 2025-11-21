# Export Error - Troubleshooting Guide

## ✅ Fixes Applied

I've added the following improvements to fix the export error:

### 1. Data Validation (app/dashboard/dsr/page.tsx)
- **Added check**: Ensures data is loaded before attempting export
- **Warning toast**: Shows "Data Loading" message if you click too early
- **Fallback values**: Provides empty objects/arrays if data is missing

### 2. Error Handling (lib/export-utils.ts)
- **Try-catch blocks**: Wraps export logic to catch errors
- **Better error messages**: Shows specific error details to user
- **URL cleanup**: Properly revokes object URLs after download

### 3. Improved Toast Notifications
- **Loading state**: Shows when data is still loading
- **Error details**: Displays actual error message instead of generic text
- **Success feedback**: Confirms when export completes

## 🔍 Possible Causes of "Export Failed" Error

### 1. **Data Not Loaded Yet**
**Symptom**: Click export immediately after page loads  
**Fix**: Wait for all metrics to appear (spinners disappear)  
**Solution Applied**: ✅ Added validation to prevent export during loading

### 2. **No Data for Selected Date Range**
**Symptom**: Date range has no calls/leads  
**Fix**: Change date range to period with data  
**Solution Applied**: ✅ Added fallback values (0 for empty data)

### 3. **Browser Popup Blocker (PDF only)**
**Symptom**: PDF export fails with popup message  
**Fix**: Allow popups for localhost in browser settings  
**Solution Applied**: ✅ Better error message guides user

### 4. **Session Expired**
**Symptom**: Export fails after being idle  
**Fix**: Refresh page to restore session  
**Solution Applied**: ✅ Error shows if session data missing

## 🧪 Testing Steps

### Test Export After Fix
1. **Refresh the browser** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Wait for data to load** (all spinners should disappear)
3. **Check metrics are showing** (Total Calls, Talk Time, etc.)
4. **Click "Export Excel"**
5. **Expected**: File downloads as `DSR_2025-11-21_to_2025-11-21.csv`

### If Still Failing
1. **Open Browser Console** (F12 → Console tab)
2. **Click Export Excel**
3. **Copy error message** from console
4. **Check error type below**

## 🐛 Common Error Messages

### Error: "Cannot read properties of undefined"
```
Cause: Data not loaded or API failed
Fix: Check browser console for API errors
Look for: /api/dsr/my-performance failing
```

### Error: "Failed to generate Excel file"
```
Cause: Export utility error during CSV creation
Fix: Check if data structure matches expected format
Look for: Null/undefined values in performance data
```

### Error: "Please allow popups to export PDF"
```
Cause: Browser blocking popup window
Fix: Click address bar icon → Allow popups for this site
```

### Error: "Network request failed" 
```
Cause: API endpoints not responding
Fix: Check if npm run dev is running
Check: http://localhost:3000/api/dsr/my-performance
```

## 🔧 Quick Fixes

### Fix 1: Clear Browser Cache
```bash
# Windows: Ctrl+Shift+Delete
# Mac: Cmd+Shift+Delete
# Then select "Cached images and files"
```

### Fix 2: Restart Dev Server
```bash
# In terminal, press Ctrl+C to stop
npm run dev
# Wait for "ready started server on"
```

### Fix 3: Hard Refresh Browser
```bash
# Windows: Ctrl+Shift+R
# Mac: Cmd+Shift+R
```

### Fix 4: Check API Responses
```javascript
// Open browser console and run:
fetch('/api/dsr/my-performance?startDate=2025-11-21&endDate=2025-11-21')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)

// Should show: { totalCalls: X, answeredCalls: Y, ... }
// If error: API is broken, check server logs
```

## 📊 Expected Data Structure

### What Export Needs
```typescript
{
  performance: {
    totalCalls: number,
    answeredCalls: number,
    notAnsweredCalls: number,
    totalTalkTime: number,
    avgCallDuration: number,
    uniqueLeadsContacted: number,
    newLeadsHandled: number,
    followUpsScheduled: number,
    followUpsCompleted: number,
    unreachableCount: number,
    unqualifiedCount: number,
    followUpCalls: number
  },
  statusBreakdown: {
    breakdown: Array<{ status: string, count: number, percentage: number }>
  },
  avgCalls: {
    totalLeadsWorked: number,
    totalCalls: number,
    avgCallsPerLead: number,
    trend: Array<{ date: string, avgCallsPerLead: number, ... }>
  },
  mostContacted: {
    lead: { name: string, phone: string, status: string },
    attemptCount: number
  },
  agentPerformance: Array<{ agentName: string, ... }> // SuperAgent only
}
```

### Current Data Check
Open browser console and run:
```javascript
// Check what data is available
console.log('Performance:', window.myPerformanceData);
console.log('Status:', window.statusBreakdownData);
```

## ✅ Verification Checklist

After applying fixes, verify:

- [ ] Browser refreshed (hard refresh)
- [ ] Dev server running (`npm run dev`)
- [ ] Page loads without errors (check console)
- [ ] All metrics display values (not spinners)
- [ ] Export Excel button clickable
- [ ] Toast shows "Export Started"
- [ ] File downloads to Downloads folder
- [ ] CSV opens in Excel/Sheets
- [ ] Data appears in CSV file

## 🎯 Success Indicators

### Excel Export Success
```
✅ Toast: "Export Started" → "Export Complete"
✅ File: DSR_2025-11-21_to_2025-11-21.csv in Downloads
✅ Size: ~5-15 KB
✅ Opens in Excel showing metrics
```

### PDF Export Success
```
✅ Toast: "Export Started" → "Export Complete"
✅ New window opens with formatted report
✅ Print dialog appears
✅ Can save as PDF
```

## 🚨 If Nothing Works

### Last Resort Steps
1. **Check database has data**
   ```sql
   -- Run in MySQL
   SELECT COUNT(*) FROM CallLog WHERE DATE(startedAt) = '2025-11-21';
   -- Should return > 0
   ```

2. **Check API routes exist**
   ```bash
   ls app/api/dsr/
   # Should show: my-performance/, status-breakdown/, etc.
   ```

3. **Check lib/export-utils.ts exists**
   ```bash
   ls lib/export-utils.ts
   # Should exist with ~430 lines
   ```

4. **Restart everything**
   ```bash
   # Stop dev server (Ctrl+C)
   # Restart MySQL (if needed)
   npm run dev
   # Hard refresh browser
   ```

## 📝 Report Bug Template

If error persists, provide:
```
Browser: Chrome/Firefox/Safari version X
Error Message: [paste from console]
API Response: [paste from /api/dsr/my-performance]
Date Range: [Today/Week/Month/Custom]
Data Visible: [Yes/No - are metrics showing?]
Console Errors: [paste any red errors]
```

---

**Status**: Fixes applied, ready to test  
**Next Step**: Hard refresh browser and try export  
**Expected**: Should work now with better error messages
