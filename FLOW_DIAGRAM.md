# Meta Webhook Flow - Visual Guide

## 🔄 Complete Webhook Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Meta Lead Form                              │
│                    (User submits their info)                        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Meta Webhook Service                           │
│              (Facebook sends POST to your endpoint)                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│              POST /api/webhooks/meta-leads                          │
│                                                                     │
│  Step 1: Receive Webhook                                           │
│  ├─ Validate signature (x-hub-signature-256)                       │
│  ├─ Log raw payload                                                │
│  └─ Parse JSON body                                                │
│                                                                     │
│  Step 2: Extract Lead IDs                                          │
│  ├─ leadgen_id: "123456789"                                        │
│  ├─ form_id: "456"                                                 │
│  ├─ page_id: "789"                                                 │
│  ├─ ad_id: "321" (may be missing)                                  │
│  ├─ adgroup_id: "654" (may be missing)                             │
│  └─ campaign_id: "987" (may be missing)                            │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 3: Fetch COMPLETE Lead Data from Meta API                    │
│                                                                     │
│  GET https://graph.facebook.com/v21.0/{leadgen_id}                 │
│      ?fields=id,created_time,ad_id,adset_id,campaign_id,           │
│               form_id,field_data                                   │
│      &access_token={META_ACCESS_TOKEN}                             │
│                                                                     │
│  ⚡ WITH RETRY LOGIC (up to 3 attempts)                            │
│  ├─ Attempt 1: Immediate                                           │
│  ├─ Attempt 2: Wait 1s, retry                                      │
│  ├─ Attempt 3: Wait 2s, retry                                      │
│  └─ Attempt 4: Wait 4s, retry                                      │
│                                                                     │
│  Returns:                                                           │
│  {                                                                  │
│    "id": "123456789",                                              │
│    "created_time": "1234567890",                                   │
│    "ad_id": "321",           ← NOW INCLUDED                        │
│    "adset_id": "654",        ← NOW INCLUDED                        │
│    "campaign_id": "987",     ← NOW INCLUDED                        │
│    "form_id": "456",         ← NOW INCLUDED                        │
│    "field_data": [                                                 │
│      { "name": "full_name", "values": ["John Doe"] },              │
│      { "name": "phone_number", "values": ["+1234567890"] },        │
│      { "name": "email", "values": ["john@example.com"] }           │
│    ]                                                               │
│  }                                                                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 4: Parse Lead Fields                                         │
│  ├─ name: "John Doe"                                               │
│  ├─ phone: "+1234567890" → normalized → "1234567890"               │
│  ├─ email: "john@example.com"                                      │
│  └─ customFields: { message: "...", ... }                          │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 5: Check for Duplicates                                      │
│                                                                     │
│  Check 1: By Meta Lead ID                                          │
│  SELECT * FROM Lead                                                │
│  WHERE source = 'meta'                                             │
│    AND JSON_EXTRACT(metadata, '$.metaLeadId') = '123456789'        │
│                                                                     │
│  Check 2: By Phone Number                                          │
│  SELECT * FROM Lead                                                │
│  WHERE source = 'meta'                                             │
│    AND phone = '1234567890'                                        │
│                                                                     │
│  If duplicate found → Skip (return early) ✓                        │
│  If no duplicate → Continue ↓                                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 6: Fetch Campaign/Adset/Ad Names (IN PARALLEL)               │
│                                                                     │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────┐│
│  │ GET /{campaign_id}  │  │ GET /{adset_id}     │  │ GET /{ad_id}││
│  │ ?fields=name        │  │ ?fields=name        │  │ ?fields=name││
│  │                     │  │                     │  │             ││
│  │ ⚡ Retry logic      │  │ ⚡ Retry logic      │  │ ⚡ Retry    ││
│  │                     │  │                     │  │   logic     ││
│  │ Returns:            │  │ Returns:            │  │ Returns:    ││
│  │ {                   │  │ {                   │  │ {           ││
│  │   name: "Summer"    │  │   name: "Target"    │  │   name:     ││
│  │         "Sale 2025" │  │         "Audience"  │  │     "Var 1" ││
│  │ }                   │  │ }                   │  │ }           ││
│  └─────────────────────┘  └─────────────────────┘  └─────────────┘│
│           ↓                         ↓                      ↓       │
│  campaignName            adsetName              adName             │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 7: Build Metadata Object                                     │
│  {                                                                  │
│    "metaLeadId": "123456789",                                      │
│    "formId": "456",                                                │
│    "pageId": "789",                                                │
│    "adId": "321",                                                  │
│    "adsetId": "654",                                               │
│    "campaignId": "987",                                            │
│    "campaignName": "Summer Sale 2025",     ← NEW                   │
│    "adsetName": "Target Audience A",       ← NEW                   │
│    "adName": "Creative Variant 1",         ← NEW                   │
│    "submittedAt": "2025-01-05T10:30:00Z",                          │
│    "webhookReceived": "2025-01-05T10:30:01Z",                      │
│    "dataFetchedAt": "2025-01-05T10:30:02Z"                         │
│  }                                                                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 8: Get Agent Assignment                                      │
│                                                                     │
│  SELECT id FROM User                                               │
│  WHERE email = 'gomathi@baleenmedia.com'                           │
│    AND isActive = true                                             │
│                                                                     │
│  If Gomathi found → assignedToId = gomathi.id                      │
│  If not found → assignedToId = first active agent                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 9: Create Lead in Database                                   │
│                                                                     │
│  INSERT INTO Lead (                                                │
│    id,                  → crypto.randomUUID()                      │
│    name,                → "John Doe"                               │
│    phone,               → "1234567890"                             │
│    email,               → "john@example.com"                       │
│    source,              → "meta"                                   │
│    campaign,            → "Summer Sale 2025" (or ID if no name)    │
│    status,              → "new"                                    │
│    customerRequirement, → customFields.message                     │
│    notes,               → "Lead received via Meta webhook..."      │
│    metadata,            → JSON.stringify(metadata)                 │
│    assignedToId,        → gomathi.id                               │
│    createdAt,           → now()                                    │
│    updatedAt            → now()                                    │
│  )                                                                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 10: Log Activity                                             │
│                                                                     │
│  INSERT INTO ActivityHistory (                                     │
│    id,          → crypto.randomUUID()                              │
│    leadId,      → lead.id                                          │
│    userId,      → "system"                                         │
│    action,      → "created"                                        │
│    description  → "Meta lead received via webhook.                 │
│                    Lead ID: 123456789.                             │
│                    Campaign: Summer Sale 2025.                     │
│                    Ad: Creative Variant 1."                        │
│  )                                                                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 11: Return Success to Meta                                   │
│                                                                     │
│  HTTP 200 OK                                                       │
│  {                                                                  │
│    "success": true,                                                │
│    "received": true,                                               │
│    "processed": 1,                                                 │
│    "failed": 0                                                     │
│  }                                                                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
                         ✅ COMPLETE

Total time: ~2-5 seconds
- Lead fetch: ~500ms
- Name fetching (parallel): ~800ms
- Database operations: ~200ms
- Overhead: ~500ms
```

---

## 🔄 Error Handling & Retry Flow

```
Meta API Call
     │
     ▼
┌─────────────────┐
│   Try Request   │
└────────┬────────┘
         │
         ▼
    ┌────────────┐
    │ Success?   │
    └─────┬──────┘
          │
   ┌──────┴──────┐
   │             │
  YES           NO
   │             │
   ▼             ▼
Return      ┌──────────────────┐
Result      │ Retryable Error? │
            └────────┬─────────┘
                     │
              ┌──────┴──────┐
              │             │
             YES           NO
              │             │
              ▼             ▼
       ┌──────────────┐  Throw
       │ Retry Count  │  Error
       │   < 3?       │
       └──────┬───────┘
              │
       ┌──────┴──────┐
       │             │
      YES           NO
       │             │
       ▼             ▼
    Wait         Throw
  (backoff)      Error
       │
       ▼
  Try Again
```

**Retryable Errors:**
- Network: ETIMEDOUT, ECONNRESET, ENOTFOUND
- Rate limit: Meta error codes 4, 17, 32, 613
- Temporary: Meta error codes 1, 2
- API unavailable: Meta subcode 2108006

**Backoff Schedule:**
- Retry 1: Wait 1000ms
- Retry 2: Wait 2000ms
- Retry 3: Wait 4000ms
- Max delay: 5000ms

---

## 📊 Data Flow Comparison

### BEFORE (Old Implementation)

```
Meta Form
   ↓
Webhook POST → Extract leadgen_id
   ↓
Fetch Lead Data
   fields=id,created_time,field_data
   ↓
Parse Fields
   ↓
(Maybe) Fetch Campaign Name
   ↓
Create Lead
   campaign = campaign_id OR campaign_name (if fetched)
   metadata = { metaLeadId, formId, campaignId }
   ↓
Done
```

**Missing:**
- ❌ ad_id, adset_id from API
- ❌ Adset name
- ❌ Ad name
- ❌ Retry logic
- ❌ Comprehensive logging

---

### AFTER (Enhanced Implementation)

```
Meta Form
   ↓
Webhook POST → Extract leadgen_id + all IDs
   ↓
Fetch COMPLETE Lead Data (WITH RETRY)
   fields=id,created_time,ad_id,adset_id,campaign_id,form_id,field_data
   ↓
Parse Fields
   ↓
Check Duplicates
   ↓
Fetch Names IN PARALLEL (WITH RETRY)
   ├─ Campaign Name
   ├─ Adset Name
   └─ Ad Name
   ↓
Create Lead
   campaign = campaign_name (or ID if unavailable)
   metadata = { 
     metaLeadId, formId, pageId,
     adId, adsetId, campaignId,
     adName, adsetName, campaignName,
     timestamps
   }
   ↓
Log Activity
   ↓
Return Summary
```

**Added:**
- ✅ Complete lead data (all IDs)
- ✅ Adset name resolution
- ✅ Ad name resolution
- ✅ Retry logic on all API calls
- ✅ Comprehensive logging
- ✅ Parallel API calls
- ✅ Better error handling
- ✅ Processing summary

---

## 🎯 Key Improvement: Parallel Name Fetching

### Sequential (Before)
```
Fetch Campaign Name (800ms)
      ↓
   (wait)
      ↓
Fetch Adset Name (800ms) ← NOT IMPLEMENTED
      ↓
   (wait)
      ↓
Fetch Ad Name (800ms) ← NOT IMPLEMENTED
      ↓
Total: 2400ms (if all were implemented)
```

### Parallel (After)
```
┌─ Fetch Campaign Name (800ms) ─┐
├─ Fetch Adset Name (800ms) ────┤
└─ Fetch Ad Name (800ms) ───────┘
                 ↓
              (all finish together)
                 ↓
            Total: 800ms
```

**Time Saved:** 1600ms (~67% faster)

---

## 🔍 Logging Output Flow

```
[10:30:00.000] 📥 WEBHOOK POST RECEIVED
[10:30:00.001] 📥 Request headers { hasSignature: true }
[10:30:00.002] 📥 Request body { length: 1234 }
[10:30:00.003] 📥 Parsed body { object: "page", ... }
[10:30:00.004] 📥 ✅ Signature verified
[10:30:00.005] 📥 Processing lead: 123456789
[10:30:00.006] 🔍 Fetching complete lead data from Meta API...
[10:30:00.500] ✅ Lead data fetched successfully
[10:30:00.501] 📥 Lead data received { hasAdId: true, ... }
[10:30:00.502] 🔍 Fetching campaign/adset/ad names...
[10:30:00.503] 🔍 Fetching campaign name for ID: 987
[10:30:00.504] 🔍 Fetching adset name for ID: 654
[10:30:00.505] 🔍 Fetching ad name for ID: 321
[10:30:01.300] ✅ Campaign name: "Summer Sale 2025" (ID: 987)
[10:30:01.301] ✅ Adset name: "Target Audience A" (ID: 654)
[10:30:01.302] ✅ Ad name: "Creative Variant 1" (ID: 321)
[10:30:01.350] ✅ Lead created successfully
[10:30:01.360] ✅ Activity logged for lead abc-123
[10:30:01.361] ✅ WEBHOOK PROCESSING COMPLETED (1361ms)
                { processed: 1, failed: 0 }
```

Every step is logged with:
- ✅ Timestamp
- ✅ Event type (emoji)
- ✅ Context data
- ✅ Duration

---

This visual guide shows exactly how your enhanced webhook processes leads from Meta forms!
