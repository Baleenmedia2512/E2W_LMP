# 🎯 Meta Webhook - Quick Reference Card

## 🚀 Quick Start Commands

```powershell
# 1. Start your app
npm run dev

# 2. Start ngrok (new terminal)
ngrok http 3000

# 3. Copy ngrok HTTPS URL and use in Meta webhook config
```

---

## 🔗 Important URLs

### Local Development
```
Webhook URL: http://localhost:3000/api/webhooks/meta-leads
Polling URL: http://localhost:3000/api/cron/sync-meta-leads
```

### With ngrok
```
Webhook URL: https://YOUR-ID.ngrok.io/api/webhooks/meta-leads
```

### Production
```
Webhook URL: https://your-domain.com/api/webhooks/meta-leads
Polling URL: https://your-domain.com/api/cron/sync-meta-leads
```

---

## 🔑 Required Environment Variables

```env
META_APP_SECRET="get_from_facebook_app_settings"
META_WEBHOOK_VERIFY_TOKEN="E2W_LMP_META_WEBHOOK_2025"
META_ACCESS_TOKEN="get_from_facebook_page_token_tool"
META_PAGE_ID="your_facebook_page_id"
CRON_SECRET="your-secret-key-change-in-production"
```

---

## 📋 Meta Dashboard Configuration

### Webhook Settings
```
Callback URL: https://YOUR-NGROK-URL.ngrok.io/api/webhooks/meta-leads
Verify Token: E2W_LMP_META_WEBHOOK_2025
Fields: ✅ leadgen
```

### Required Permissions
```
✅ leads_retrieval
✅ pages_read_engagement
✅ pages_manage_ads
```

---

## 🧪 Testing Commands

### Test Webhook Verification
```powershell
curl "http://localhost:3000/api/webhooks/meta-leads?hub.mode=subscribe&hub.verify_token=E2W_LMP_META_WEBHOOK_2025&hub.challenge=test123"
# Expected: test123
```

### Test Webhook POST
```powershell
$env:META_APP_SECRET="your-app-secret"
.\test-meta-webhook.ps1
```

### Test Polling
```powershell
curl http://localhost:3000/api/cron/sync-meta-leads -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Verify Integration
```powershell
.\verify-meta-integration.ps1
```

---

## 🗄️ Database Queries

### Check Recent Meta Leads
```sql
SELECT id, name, phone, email, source, createdAt 
FROM Lead 
WHERE source = 'Meta' 
ORDER BY createdAt DESC 
LIMIT 10;
```

### Check Placeholder Leads
```sql
SELECT id, name, phone, metadata 
FROM Lead 
WHERE source = 'Meta' AND phone = 'PENDING';
```

### Check Lead Metadata
```sql
SELECT id, name, phone, JSON_EXTRACT(metadata, '$.metaLeadId') as metaLeadId
FROM Lead 
WHERE source = 'Meta' 
ORDER BY createdAt DESC 
LIMIT 10;
```

---

## 🔧 Troubleshooting Quick Fixes

### Webhook Verification Failed
```
✓ Check ngrok is running
✓ Verify token matches exactly (case-sensitive)
✓ Ensure app is running on localhost:3000
✓ Check for typos in callback URL
```

### No Leads Appearing
```
✓ Check console logs for errors
✓ Verify page is subscribed in Meta dashboard
✓ Check access token has leads_retrieval permission
✓ Run polling manually to catch missed leads
```

### Phone Stays "PENDING"
```
✓ Run polling endpoint manually
✓ Verify META_ACCESS_TOKEN is valid
✓ Check META_PAGE_ID is correct
✓ Review console logs for API errors
```

---

## 📞 Where to Get Credentials

| Credential | Where to Find |
|------------|---------------|
| App Secret | Meta App Dashboard → Settings → Basic → App Secret |
| Page Access Token | https://developers.facebook.com/tools/accesstoken |
| Page ID | Facebook Page → About → Page ID |
| Verify Token | You create this (any random string) |

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `WEBHOOK_SETUP_QUICK.md` | 5-minute setup guide |
| `WEBHOOK_CREATION_PROCEDURE.md` | Detailed step-by-step |
| `META_INTEGRATION_GUIDE.md` | Complete reference |
| `META_INTEGRATION_README.md` | Implementation summary |

---

## 🎯 Production Checklist

Before going live:

- [ ] All tests passing locally
- [ ] .env variables configured
- [ ] Facebook App approved (if required)
- [ ] Webhook URL updated to production domain
- [ ] HTTPS enabled on production server
- [ ] Polling scheduled (every 30 minutes)
- [ ] Monitoring/logging enabled
- [ ] Test with real lead ad
- [ ] Backup/disaster recovery plan

---

## 💡 Pro Tips

1. **Keep ngrok running** while testing locally
2. **Free ngrok URL changes** on restart - update Meta webhook each time
3. **Polling is backup** - don't disable webhook
4. **Check logs regularly** - they show all errors
5. **Test with small ads first** before high-volume campaigns
6. **Long-lived tokens** don't expire - get them from Business Manager
7. **Deduplication is automatic** - don't worry about duplicates
8. **Round-robin is fair** - all agents get equal leads

---

## 📊 Expected Flow

```
1. User submits ad → ~2 seconds → Placeholder in DB
2. Polling runs → ~30 mins later → Full data updated
3. Agent assigned → Immediately → Notification sent
4. Agent calls → Any time → Lead management begins
```

---

## 🆘 Emergency Commands

### Restart Everything
```powershell
# Stop app (Ctrl+C)
# Stop ngrok (Ctrl+C)
npm run dev          # New terminal 1
ngrok http 3000      # New terminal 2
```

### Force Sync All Leads
```powershell
curl http://localhost:3000/api/cron/sync-meta-leads -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Check App Health
```powershell
curl http://localhost:3000/api/health
```

---

**Keep this card handy during setup! 📌**

Print or save for quick reference during Meta webhook configuration.
