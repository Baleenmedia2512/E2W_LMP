# Undo Operation Feature (US-055) - Implementation Guide

## 📋 Overview

The Undo Operation feature allows users to reverse their last action within a 60-second window. This provides a safety net for accidental changes and improves user experience.

## ✨ Features Implemented

### 1. **Global Undo Button**
- Located in the Header (top-right corner)
- Only appears when an undo action is available
- Shows countdown timer for last 10 seconds
- Color-coded: Orange for emphasis
- Responsive: Full button on desktop, icon-only on mobile

### 2. **Undoable Actions**
The following actions can be undone:

| Action | Description | What Gets Reversed |
|--------|-------------|-------------------|
| **Update Lead** | Editing lead details | Restores name, phone, email, status, priority, notes |
| **Update Status** | Changing lead status | Restores previous status, notes, metadata |
| **Assign Lead** | Assigning/reassigning lead | Restores previous assignment |
| **Add Call Log** | Creating a call record | Deletes the call log, restores lead status |
| **Schedule Follow-up** | Scheduling a follow-up | Deletes the follow-up, restores lead status |

### 3. **Smart Expiration**
- Each action can be undone for **60 seconds**
- Timer countdown displayed in tooltip and badge
- Visual warning when < 10 seconds remain
- Expired actions automatically removed

### 4. **User Feedback**
- Toast notifications for success/error
- Action name displayed in tooltip
- Real-time countdown timer
- Auto-refresh of affected pages

### 5. **Automatic Refresh**
- Dashboard refreshes after undo
- Leads page refreshes after undo
- No manual page reload needed

## 🔧 Technical Implementation

### Files Created

1. **`lib/hooks/useUndo.ts`**
   - Custom React hook for undo functionality
   - Manages undo state, timer, and API calls
   - Provides toast notifications
   - Auto-refreshes every 5 seconds

2. **`lib/undo-helper.ts`**
   - Server-side utility functions
   - `createUndoLog()` - Create undo entry
   - `cancelUndoLogs()` - Expire undo logs
   - `getLatestUndoLog()` - Fetch latest action

### Files Modified

1. **`components/layout/Header.tsx`**
   - Added conditional undo button
   - Integrated useUndo hook
   - Shows timer countdown badge
   - Tooltip with action name

2. **`app/api/undo/route.ts`**
   - Added support for 5 action types
   - Enhanced switch statement
   - Handles call log deletion
   - Handles follow-up deletion

3. **`app/api/leads/[id]/status/route.ts`**
   - Added undo tracking for status changes
   - Captures previous state before update
   - Updated status enum with new statuses

4. **`app/api/calls/route.ts`**
   - Added undo tracking for call logs
   - Stores lead status before change
   - Imported undo helper

5. **`app/api/followups/route.ts`**
   - Added undo tracking for follow-ups
   - Stores lead status before change
   - Imported undo helper

6. **`app/dashboard/page.tsx`**
   - Listens for `undo-performed` event
   - Auto-refreshes dashboard data

7. **`app/dashboard/leads/page.tsx`**
   - Listens for `undo-performed` event
   - Auto-refreshes leads list

### Database Schema

The `UndoLog` model (already exists):

```prisma
model UndoLog {
  id            String    @id @default(cuid())
  userId        String
  action        String    // Action type
  targetType    String    // Lead, CallLog, FollowUp, etc.
  targetId      String    // ID of the affected record
  previousState Json      // State before the action
  canUndo       Boolean   @default(true)
  undoneAt      DateTime?
  expiresAt     DateTime  // 60 seconds after creation
  createdAt     DateTime  @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([canUndo, expiresAt])
  @@index([createdAt])
}
```

## 🎯 Usage

### For Users

1. **Perform an action** (e.g., change lead status)
2. **Orange "Undo" button appears** in the header
3. **Click within 60 seconds** to reverse the action
4. **Success notification** confirms the reversal
5. **Page auto-refreshes** to show updated data

### Example Flow

```
1. Agent changes lead status from "New" → "Follow-up"
2. Undo button appears (60s countdown starts)
3. Agent realizes mistake
4. Clicks "Undo" button
5. Toast: "Action Reversed: Status Change"
6. Lead status restored to "New"
7. Dashboard refreshes automatically
```

## 🔐 Security & Permissions

- Users can only undo **their own actions**
- Undo logs filtered by `userId`
- 60-second expiration prevents abuse
- Audit trail maintained for all undo operations

## 🎨 UI/UX Features

### Desktop View
```
[Undo] [🔔] [🚪]
   ↓
Orange button with "Undo" text
Tooltip: "Undo: Status Change (45s)"
Badge shows timer if < 10s remaining
```

### Mobile View
```
[↻] [🔔] [🚪]
 ↓
Icon-only button
Same tooltip and functionality
```

### States

| State | Visual | Tooltip |
|-------|--------|---------|
| **No undo available** | Button hidden | - |
| **Undo available (>10s)** | Orange button | "Undo: [Action Name]" |
| **Undo available (<10s)** | Orange button + red badge | "Undo: [Action Name] (5s)" |
| **Undoing** | Button with spinner | - |
| **After undo** | Button disappears | Success toast shown |

## 📊 Action Tracking

### Status Changes
```typescript
await createUndoLog({
  userId: sess.user.id,
  action: 'update_status',
  targetType: 'Lead',
  targetId: leadId,
  previousState: {
    status: existingLead.status,
    notes: existingLead.notes,
    metadata: existingLead.metadata,
  },
});
```

### Call Logs
```typescript
await createUndoLog({
  userId: sess.user.id,
  action: 'add_call',
  targetType: 'CallLog',
  targetId: callLog.id,
  previousState: {
    leadId,
    leadStatus: lead.status,
  },
});
```

### Follow-ups
```typescript
await createUndoLog({
  userId: sess.user.id,
  action: 'schedule_followup',
  targetType: 'FollowUp',
  targetId: followUp.id,
  previousState: {
    leadId,
    leadStatus: lead.status,
  },
});
```

## 🧪 Testing Checklist

### Manual Testing

- [ ] Change lead status → Click undo → Verify status restored
- [ ] Create call log → Click undo → Verify call deleted
- [ ] Schedule follow-up → Click undo → Verify follow-up deleted
- [ ] Assign lead → Click undo → Verify assignment reverted
- [ ] Edit lead details → Click undo → Verify details restored
- [ ] Wait 60 seconds → Verify undo button disappears
- [ ] Perform undo → Verify dashboard refreshes
- [ ] Perform undo → Verify leads page refreshes
- [ ] Check mobile view → Verify icon-only button works
- [ ] Check tooltip → Verify action name and timer shown
- [ ] Test with < 10s remaining → Verify red badge appears

### Error Cases

- [ ] Try to undo expired action → Verify error message
- [ ] Try to undo another user's action → Verify permission denied
- [ ] Network error during undo → Verify error toast
- [ ] Multiple rapid actions → Verify latest action is undoable

## 🚀 Future Enhancements

### Potential Additions

1. **Multiple Undo Levels**
   - Show dropdown with last 5 actions
   - Allow selecting which action to undo

2. **Redo Functionality**
   - After undo, allow redo
   - 60-second redo window

3. **Undo History Panel**
   - Settings page showing undo history
   - Filter by date/action type
   - Export undo audit log

4. **Custom Expiration**
   - Admin setting for undo window
   - Different timeouts for different actions

5. **Confirmation for Critical Actions**
   - "Are you sure?" dialog for deletes
   - Skip undo for confirmed actions

## 📝 API Reference

### GET /api/undo

Fetch available undo actions for current user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "undo_123",
      "action": "update_status",
      "targetType": "Lead",
      "targetId": "lead_456",
      "previousState": {...},
      "createdAt": "2025-11-21T10:30:00Z",
      "expiresAt": "2025-11-21T10:31:00Z"
    }
  ]
}
```

### POST /api/undo

Perform undo of the most recent action.

**Response:**
```json
{
  "success": true,
  "message": "Action undone successfully",
  "data": {
    "action": "update_status",
    "targetType": "Lead",
    "targetId": "lead_456",
    "result": {...}
  }
}
```

## 🐛 Troubleshooting

### Undo button not appearing
- Check browser console for errors
- Verify action creates undo log
- Check `expiresAt` timestamp
- Ensure user is logged in

### Undo fails with error
- Check action type is supported
- Verify target record still exists
- Check user permissions
- Review server logs

### Timer not updating
- Check `useUndo` hook mounted
- Verify interval not cleared
- Check browser performance
- Try refreshing page

## ✅ Completion Summary

**User Story US-055**: ✅ **FULLY IMPLEMENTED**

- Global undo button in header
- Support for 5 action types
- 60-second undo window
- Toast notifications
- Auto-refresh on undo
- Timer countdown display
- Mobile responsive
- Full documentation

---

**Implementation Date**: November 21, 2025  
**Developer**: GitHub Copilot  
**Status**: Ready for Testing
