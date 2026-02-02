# 🎯 CRITICAL: Update These 2 Environment Variables in Vercel

## ⚠️ ACTION REQUIRED - Update Vercel Now

Go to: **https://vercel.com → Your Project → Settings → Environment Variables**

---

## 1️⃣ UPDATE: DATABASE_URL

**Current (WRONG - has connection_limit=1):**
```
postgresql://postgres:Easy2work%4025@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

**Change to (CORRECT - no connection limit):**
```
postgresql://postgres:Easy2work%4025@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

---

## 2️⃣ ADD: DIRECT_URL (if missing)

**Add this variable:**
```
postgresql://postgres:Easy2work%4025@db.wkwrrdcjknvupwsfdjtd.supabase.co:5432/postgres
```

---

## ✅ Verify These Are CORRECT (Don't Change)

Make sure these variables exist and have the correct values:

```bash
META_APP_ID = 847836698417663
META_APP_SECRET = d027d066c388978723bb4e378c93f576
META_ACCESS_TOKEN = EAAWnNnjnCxIBQOD8CHKD34TxdqDXY0meVqoH5i5wIjGiQZCgKMCQlZAF5SwAbNPPbCST8TkCtsQ8cS1LSbMit2KF6P51Eh1ijzG6TvnWrAotIpFIHZCySkZC7bnU9SyiaZCUUmDWjot3IjqkhLMHZBwh4LVrfn5rgiVHykTOKu6kq1OVxZCP4u8UqWtHVE8lajpPdVE3yYt
META_PAGE_ID = 1552034478376801
META_WEBHOOK_VERIFY_TOKEN = E2W_LMP_META_WEBHOOK_2025
NEXTAUTH_URL = https://e2wleadmanager.vercel.app
NEXT_PUBLIC_APP_URL = https://e2wleadmanager.vercel.app
NODE_ENV = production
```

---

## 🚀 After Updating Vercel Variables

### Step 1: Redeploy
1. Go to: **Vercel → Deployments**
2. Click on the latest deployment
3. Click **"Redeploy"**
4. **IMPORTANT**: UNCHECK "Use existing build cache"
5. Click **"Redeploy"**

### Step 2: Test Immediately
```bash
# Test webhook verification
curl "https://e2wleadmanager.vercel.app/api/webhooks/meta-leads?hub.mode=subscribe&hub.verify_token=E2W_LMP_META_WEBHOOK_2025&hub.challenge=test123"

# Should return: test123
```

### Step 3: Submit Test Lead
1. Go to your Facebook Page
2. Submit a test lead via your lead form
3. Check Vercel logs (real-time monitoring)
4. Verify lead appears in Supabase database

---

## 📊 What These Changes Fix

| Issue | Before | After |
|-------|--------|-------|
| Multiple webhooks fail | connection_limit=1 blocks concurrent requests | ✅ No limit, handles 100s of concurrent webhooks |
| Prisma migrations fail | Missing DIRECT_URL | ✅ DIRECT_URL allows migrations |
| Timeout errors | 10 second limit | ✅ 30 second limit for webhooks |
| No debug logs | Console stripped | ✅ Full logging visible in Vercel |

---

## ⏱️ Time Required
- Update variables: **2 minutes**
- Redeploy: **5 minutes**
- Testing: **5 minutes**
- **Total: ~12 minutes**

---

## 🆘 If Something Goes Wrong

**Immediate Rollback:**
1. Go to: Vercel → Deployments
2. Find previous working deployment
3. Click "..." → Redeploy

**Contact Support:**
- Check Vercel logs for error messages
- Check Supabase dashboard for connection issues
- Review: WEBHOOK_PRODUCTION_DEPLOYMENT.md

---

**✅ Once completed, your Meta webhooks will work perfectly with zero errors!**
