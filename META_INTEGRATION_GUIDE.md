# Meta Lead Ads Integration - Complete Documentation

## 📋 Overview

This integration allows your E2W Lead Management Platform to automatically receive leads from Facebook Lead Ads campaigns in real-time via webhooks.

---

## 🏗️ Architecture

```
Meta Lead Ad → Webhook Event → Signature Validation → Save Event → 
Fetch Lead Details (Graph API) → Create/Update Lead → Notify SuperAgents
```

---

## 📦 Components Created

### 1. **Database Models**

#### `MetaWebhookEvent`
Stores all incoming webhook events from Meta.

```prisma
model MetaWebhookEvent {
  id          String   @id @default(cuid())
  leadgenId   String   @unique
  formId      String?
  adId        String?
  campaignId  String?
  pageId      String?
  payload     Json
  processed   Boolean  @default(false)
  error       String?
  leadId      String?
  createdAt   DateTime @default(now())
  processedAt DateTime?
  lead        Lead?    @relation(fields: [leadId], references: [id])
}
```

#### `MetaConfig`
Stores Facebook Page access tokens and webhook configuration.

```prisma
model MetaConfig {
  id              String   @id @default(cuid())
  pageId          String   @unique
  pageName        String?
  pageAccessToken String   @db.Text
  verifyToken     String
  isActive        Boolean  @default(true)
  lastVerified    DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 2. **API Endpoints**

#### `GET/POST /api/meta/webhook`
- **GET**: Webhook verification (returns challenge token)
- **POST**: Receives leadgen events from Meta
- **Security**: Validates X-Hub-Signature-256

#### `GET/POST/DELETE /api/meta/config`
- **GET**: Fetch Meta configurations
- **POST**: Save/update configuration
- **DELETE**: Remove configuration
- **Access**: SuperAgent only

#### `GET/POST /api/meta/events`
- **GET**: View webhook event history
- **POST**: Retry failed events
- **Access**: SuperAgent only

### 3. **Background Processor**

`lib/meta-processor.ts` handles:
- Fetching lead details from Meta Graph API
- Field mapping and normalization
- Lead creation/update in CRM
- SuperAgent notifications
- Error handling and retry logic

### 4. **Frontend Pages**

#### `/dashboard/settings/meta`
Complete admin interface for:
- Configuring Meta integration
- Viewing webhook status
- Managing access tokens
- Monitoring recent events
- Retrying failed imports

---

## 🚀 Setup Instructions

### Step 1: Database Migration

Run the Prisma migration:

```bash
npx prisma migrate dev --name meta_integration
```

Or manually run the SQL:

```bash
mysql -u root -p e2w_lms < prisma/migrations/meta_integration.sql
```

Generate Prisma client:

```bash
npx prisma generate
```

### Step 2: Environment Variables

Add to your `.env` file:

```env
# Meta Lead Ads Integration
META_APP_SECRET="your-facebook-app-secret"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

**Getting META_APP_SECRET:**
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Open your app
3. Settings → Basic → App Secret
4. Click "Show" and copy the value

### Step 3: Facebook App Configuration

#### A. Create/Configure Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use existing
3. Add "Lead Ads" product
4. Configure permissions:
   - `leads_retrieval`
   - `pages_manage_metadata`
   - `pages_read_engagement`

#### B. Get Page Access Token

1. Graph API Explorer: [developers.facebook.com/tools/explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app
3. Select your Facebook Page
4. Add permissions: `leads_retrieval`, `pages_manage_metadata`, `pages_read_engagement`
5. Generate token
6. **Important**: Exchange for long-lived token:

```bash
https://graph.facebook.com/v18.0/oauth/access_token?
  grant_type=fb_exchange_token&
  client_id=YOUR_APP_ID&
  client_secret=YOUR_APP_SECRET&
  fb_exchange_token=SHORT_LIVED_TOKEN
```

### Step 4: Configure Webhook in E2W LMP

1. Login as **SuperAgent**
2. Navigate to **Settings → Meta Integration**
3. Fill in the form:
   - **Facebook Page ID**: Your page ID (get from Page Settings)
   - **Page Access Token**: Long-lived token from Step 3B
   - **Webhook Verify Token**: Create a random string (e.g., `my-secret-token-123`)
4. Click **Save Configuration**
5. Copy the **Webhook URL** displayed

### Step 5: Configure Facebook Webhook

1. Go to Facebook App Dashboard → Webhooks
2. Click "Add Subscription" → Page
3. Enter:
   - **Callback URL**: Your webhook URL (from E2W LMP settings)
   - **Verify Token**: Same token you entered in E2W LMP
4. Click "Verify and Save"
5. Subscribe to field: **leadgen**
6. Save changes

### Step 6: Test Integration

1. Create a test Lead Ad on Facebook
2. Submit a test lead
3. Check E2W LMP:
   - Go to **Settings → Meta Integration**
   - View "Recent Webhook Events"
   - Check if lead appears in **Dashboard → Leads**
   - SuperAgents should receive notification

---

## 🔒 Security

### Signature Validation

All webhook requests are validated using HMAC-SHA256:

```typescript
const expectedSignature = 'sha256=' + crypto
  .createHmac('sha256', META_APP_SECRET)
  .update(requestBody)
  .digest('hex');

if (signature !== expectedSignature) {
  return 401 Unauthorized;
}
```

### Best Practices

1. **HTTPS Only**: Never use HTTP for webhooks in production
2. **Secure Tokens**: Store access tokens encrypted in database
3. **Environment Variables**: Never commit secrets to git
4. **Token Rotation**: Refresh long-lived tokens every 60 days
5. **Error Logging**: Monitor failed webhook events

---

## 📊 Data Flow

### Incoming Lead Process

```
1. Meta sends POST to /api/meta/webhook
   ↓
2. Validate X-Hub-Signature-256
   ↓
3. Parse payload and extract leadgen_id
   ↓
4. Store webhook event in database (processed=false)
   ↓
5. Return 200 OK immediately (don't block Meta)
   ↓
6. Background: Fetch lead details from Graph API
   ↓
7. Extract fields (name, phone, email, custom fields)
   ↓
8. Check if lead exists by phone number
   ↓
9. Create new lead OR update existing
   ↓
10. Create notifications for SuperAgents
   ↓
11. Mark webhook event as processed
```

### Field Mapping

Meta fields are automatically mapped:

| Meta Field     | CRM Field      |
|----------------|----------------|
| full_name      | name           |
| phone_number   | phone          |
| email          | email          |
| city           | city           |
| state          | state          |
| zip_code       | pincode        |
| street_address | address        |
| custom_fields  | metadata.metaFields |

---

## 🔧 Troubleshooting

### Webhook Not Receiving Events

1. **Check webhook subscription**:
   - Facebook App → Webhooks → Page → leadgen should be ✅
   
2. **Verify callback URL is publicly accessible**:
   ```bash
   curl https://yourdomain.com/api/meta/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test
   ```
   Should return: `test`

3. **Check Meta App Secret**:
   - Ensure `META_APP_SECRET` in .env matches Facebook App Secret

4. **Review webhook logs**:
   - Settings → Meta Integration → Recent Webhook Events
   - Look for signature validation errors

### Lead Not Created

1. **Check webhook event status**:
   - Go to Settings → Meta Integration
   - Look for events with "Error" status
   
2. **Verify access token**:
   - Token must have `leads_retrieval` permission
   - Token should be long-lived (60 days)
   
3. **Check console logs**:
   ```bash
   npm run dev
   # Look for [Meta Processor] and [Meta API] logs
   ```

4. **Manual retry**:
   - Settings → Meta Integration
   - Click "Retry Failed" button

### Invalid Signature Error

1. **Verify APP_SECRET matches**:
   - Check `.env` META_APP_SECRET
   - Compare with Facebook App Settings → Basic → App Secret

2. **Check request body**:
   - Signature is calculated from raw request body
   - Don't parse JSON before validation

---

## 🎯 Features

### ✅ Implemented

- [x] Webhook verification (GET)
- [x] Webhook event reception (POST)
- [x] Signature validation (X-Hub-Signature-256)
- [x] Lead detail fetching (Graph API)
- [x] Automatic lead creation
- [x] Duplicate detection (by phone)
- [x] SuperAgent notifications
- [x] Admin configuration UI
- [x] Event monitoring dashboard
- [x] Failed event retry
- [x] Audit logging
- [x] Field mapping and normalization

### 🚧 Future Enhancements

- [ ] Queue system (Bull/BullMQ) for high-volume processing
- [ ] Webhook event replay
- [ ] Custom field mapping UI
- [ ] Multiple page support
- [ ] Auto-assignment rules for Meta leads
- [ ] Campaign-based routing
- [ ] Lead scoring from Meta ad data
- [ ] Webhook event analytics

---

## 📈 Monitoring

### View Webhook Events

```
Settings → Meta Integration → Recent Webhook Events
```

Displays:
- Leadgen ID
- Form ID
- Processing status
- Associated lead
- Timestamp
- Error messages (if any)

### Retry Failed Events

```
Settings → Meta Integration → Retry Failed Button
```

Automatically retries all events marked as unprocessed after 5+ minutes.

---

## 🧪 Testing

### Test Webhook Locally

Use **ngrok** for local testing:

```bash
# Install ngrok
npm install -g ngrok

# Start your app
npm run dev

# In another terminal, expose localhost
ngrok http 3000

# Use the ngrok HTTPS URL for webhook
https://abc123.ngrok.io/api/meta/webhook
```

### Manual Test Lead

1. Go to Facebook Page
2. Create a Lead Ad
3. Use "Test" button in Ads Manager
4. Submit test lead
5. Check E2W LMP for incoming webhook

---

## 📞 Support

For issues:
1. Check webhook event logs in Settings
2. Review browser console for errors
3. Check server logs for [Meta Webhook] and [Meta Processor] entries
4. Verify Facebook App permissions
5. Confirm webhook subscription is active

---

## 🔐 Production Checklist

Before going live:

- [ ] Use HTTPS webhook URL
- [ ] Store META_APP_SECRET securely
- [ ] Use long-lived access token (60-day)
- [ ] Set up token refresh cron job
- [ ] Enable error notifications
- [ ] Monitor webhook event success rate
- [ ] Test with real lead submission
- [ ] Configure backup/retry mechanism
- [ ] Set up audit log monitoring
- [ ] Review Meta App permissions

---

**Integration Status**: ✅ Production Ready

**Version**: 1.0.0

**Last Updated**: November 20, 2025
