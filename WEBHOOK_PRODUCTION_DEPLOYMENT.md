# 🚀 Meta Webhook Production Deployment Guide

## ✅ Pre-Deployment Checklist

### 1. **Verify Local Environment**
```bash
# Test local webhook endpoint
npm run dev
# In another terminal:
curl "http://localhost:3000/api/webhooks/meta-leads?hub.mode=subscribe&hub.verify_token=E2W_LMP_META_WEBHOOK_2025&hub.challenge=test123"
# Should return: test123
```

### 2. **Verify Supabase PostgreSQL Connection**
```bash
# Test database connection
npx prisma studio
# Should open and show your tables
```

---

## 🔧 Vercel Environment Variables (CRITICAL)

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

### Required Variables (Production):

```bash
# Database - Supabase PostgreSQL
DATABASE_URL="postgresql://postgres:Easy2work%4025@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:Easy2work%4025@db.wkwrrdcjknvupwsfdjtd.supabase.co:5432/postgres"

# Meta/Facebook - DO NOT CHANGE (These are working)
META_APP_ID="847836698417663"
META_APP_SECRET="d027d066c388978723bb4e378c93f576"
META_ACCESS_TOKEN="EAAWnNnjnCxIBQOD8CHKD34TxdqDXY0meVqoH5i5wIjGiQZCgKMCQlZAF5SwAbNPPbCST8TkCtsQ8cS1LSbMit2KF6P51Eh1ijzG6TvnWrAotIpFIHZCySkZC7bnU9SyiaZCUUmDWjot3IjqkhLMHZBwh4LVrfn5rgiVHykTOKu6kq1OVxZCP4u8UqWtHVE8lajpPdVE3yYt"
META_PAGE_ID="1552034478376801"
META_WEBHOOK_VERIFY_TOKEN="E2W_LMP_META_WEBHOOK_2025"

# NextAuth
NEXTAUTH_SECRET="e2w-lmp-nextauth-secret-prod-2025-a1s2d3f4g5h6j7k8l9z0x1c2v3b4n5"
NEXTAUTH_URL="https://e2-w-lmp.vercel.app"
NEXT_PUBLIC_APP_URL="https://e2-w-lmp.vercel.app"

# App Configuration
NODE_ENV="production"
CRON_SECRET="E2W_LMP_META_WEBHOOK_2026"
JWT_SECRET="e2w-lmp-jwt-secret-prod-2025-k8j9m3n4v5b6x7z8q1w2r3t4y5u6i7o8p9"
```

### ⚠️ IMPORTANT NOTES:
1. **DATABASE_URL**: No `connection_limit=1` (removed for better performance)
2. **DIRECT_URL**: Must be present for Prisma migrations
3. **META_APP_ID**: Keep `847836698417663` (your working production value)

---

## 📦 Deployment Steps

### Step 1: Commit Changes
```bash
git add .
git commit -m "Fix webhook production issues: PostgreSQL migration, timeout config, error handling"
git push origin main
```

### Step 2: Deploy to Vercel
```bash
# Option A: Automatic (if connected to GitHub)
# Push triggers automatic deployment

# Option B: Manual via Vercel Dashboard
# Go to Vercel → Deployments → Click "Redeploy"
# ⚠️ UNCHECK "Use existing build cache"
```

### Step 3: Wait for Deployment
- Monitor build logs in Vercel dashboard
- Ensure no TypeScript errors
- Ensure Prisma generates successfully

---

## 🧪 Post-Deployment Testing

### Test 1: Webhook Verification Endpoint
```bash
curl "https://e2-w-lmp.vercel.app/api/webhooks/meta-leads?hub.mode=subscribe&hub.verify_token=E2W_LMP_META_WEBHOOK_2025&hub.challenge=test123"
# Expected: test123
```

### Test 2: Database Connection
```bash
# Visit your app and login
https://e2-w-lmp.vercel.app/login
# Check if leads page loads (confirms database connection)
https://e2-w-lmp.vercel.app/dashboard/leads
```

### Test 3: Meta Webhook Subscription
1. Go to: https://developers.facebook.com/apps/847836698417663/webhooks/
2. Find your webhook subscription
3. Click "Test" button
4. Select "leadgen" test event
5. Check Vercel logs for processing confirmation

### Test 4: Real Lead Submission
1. Go to your Facebook Page with Lead Form
2. Submit a test lead
3. Check Vercel logs (real-time):
   - Go to Vercel Dashboard → Logs
   - Filter by: `/api/webhooks/meta-leads`
4. Verify lead appears in database:
   - Open Prisma Studio: `npx prisma studio`
   - OR check Supabase dashboard

---

## 🔍 Monitoring & Debugging

### View Real-Time Logs
```bash
# Vercel Dashboard → Your Project → Logs
# Or use Vercel CLI:
vercel logs --follow
```

### Check for Errors
Look for these patterns in logs:
- ✅ `✅ WEBHOOK PROCESSING COMPLETED` - Success
- ❌ `ERROR PROCESSING WEBHOOK` - Failure
- ⚠️ `Signature verification failed` - Check META_APP_SECRET
- ❌ `Failed to fetch lead data` - Check META_ACCESS_TOKEN
- ❌ `Can't reach database server` - Check DATABASE_URL

### Common Issues & Fixes

| Issue | Symptom | Fix |
|-------|---------|-----|
| **Database timeout** | "Connection timeout" | Verify DATABASE_URL has no `connection_limit=1` |
| **Missing DIRECT_URL** | Prisma migration errors | Add DIRECT_URL to Vercel env vars |
| **Invalid access token** | "Invalid OAuth access token" | Check META_ACCESS_TOKEN hasn't expired |
| **Signature mismatch** | "Invalid webhook signature" | Verify META_APP_SECRET matches Meta dashboard |
| **Timeout errors** | "Function execution timeout" | Confirmed fixed (30s timeout for webhooks) |

---

## 📊 Performance Metrics

### Expected Response Times:
- **Webhook verification (GET)**: < 100ms
- **Lead processing (POST)**: 5-15 seconds (includes Meta API calls)
- **Duplicate check**: < 500ms
- **Database write**: < 1 second

### Timeout Configuration:
- ✅ **Webhook routes**: 30 seconds (configured in vercel.json)
- ✅ **Other API routes**: 10 seconds

---

## 🔒 Security Checklist

- ✅ Webhook signature verification enabled
- ✅ HTTPS only (Vercel enforced)
- ✅ Environment variables encrypted (Vercel)
- ✅ Database connection uses TLS (Supabase)
- ✅ Access tokens not exposed in logs

---

## 🆘 Emergency Rollback

If production fails after deployment:

```bash
# Option 1: Revert last commit
git revert HEAD
git push origin main

# Option 2: Redeploy previous version in Vercel
# Go to: Vercel Dashboard → Deployments
# Find last working deployment
# Click "..." → "Redeploy"
```

---

## ✨ Changes Made in This Fix

1. **vercel.json**: Increased webhook timeout from 10s → 30s
2. **next.config.js**: Disabled console.log removal in production
3. **.env.vercel.production**: Removed `connection_limit=1`
4. **webhook route**: Enhanced error logging and validation
5. **Database queries**: PostgreSQL JSONB operators verified

---

## 📞 Support

**Supabase Dashboard**: https://app.supabase.com/project/wkwrrdcjknvupwsfdjtd
**Vercel Dashboard**: https://vercel.com/[your-team]/e2-w-lmp
**Meta App Dashboard**: https://developers.facebook.com/apps/847836698417663/

---

**Last Updated**: January 8, 2026
**Migration Status**: MySQL → PostgreSQL Complete ✅
**Webhook Status**: Production-Ready ✅
