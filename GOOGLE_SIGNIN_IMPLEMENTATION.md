# 🔐 Google Sign-In Production Implementation Guide

## ✅ **IMPLEMENTATION STATUS: COMPLETE**

Your Google Sign-In is now **production-ready** with proper email verification!

---

## 🎯 **How It Works**

### **Authentication Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User clicks "Sign in with Google"                           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Google OAuth popup opens                                     │
│    User selects their Google account                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Google redirects back with user info                         │
│    Email: user@example.com                                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. signIn Callback Runs (lib/auth.ts)                          │
│    ✓ Check: Is email in database?                              │
└─────────────────────────────────────────────────────────────────┘
                ↓                              ↓
        ❌ NOT FOUND                    ✅ FOUND
                ↓                              ↓
┌──────────────────────────┐    ┌──────────────────────────────┐
│ 5a. DENY ACCESS          │    │ 5b. GRANT ACCESS             │
│ Redirect to error page   │    │ Check if account is active   │
│ Show: "Contact Admin"    │    │ Link Google account to user  │
└──────────────────────────┘    └──────────────────────────────┘
                                             ↓
                        ┌──────────────────────────────────┐
                        │ 6. JWT Callback Runs             │
                        │ Create Account record in DB      │
                        │ Set token with user role & ID    │
                        └──────────────────────────────────┘
                                             ↓
                        ┌──────────────────────────────────┐
                        │ 7. Session Created               │
                        │ User redirected to /dashboard    │
                        │ ✅ SUCCESS!                      │
                        └──────────────────────────────────┘
```

---

## 🔧 **Key Changes Made**

### **1. Removed PrismaAdapter (CRITICAL FIX)**

**Before (Insecure):**
```typescript
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma), // ❌ Auto-creates ANY Google user
  // ...
}
```

**After (Secure):**
```typescript
export const authOptions: NextAuthOptions = {
  // ✅ No adapter - we control user creation manually
  providers: [GoogleProvider({...})],
  callbacks: {
    // Custom verification logic
  }
}
```

**Why:** PrismaAdapter automatically creates database records for ANY Google user before your verification logic runs, bypassing security.

---

### **2. Enhanced signIn Callback**

**Location:** `lib/auth.ts` (Lines 48-74)

```typescript
async signIn({ user, account }) {
  if (account?.provider === 'google') {
    // 1. Email must exist
    if (!user.email) return false;

    // 2. Check if user is registered in database
    const existingUser = await prisma.user.findUnique({
      where: { email: user.email },
      include: { role: true },
    });

    // 3. DENY if not registered
    if (!existingUser) {
      console.log(`🚫 Access denied: ${user.email}`);
      return '/auth/error?error=NotRegistered';
    }

    // 4. DENY if account inactive
    if (!existingUser.isActive) {
      return '/auth/error?error=AccountInactive';
    }

    // 5. Link Google account to existing user
    if (!existingUser.googleId) {
      await prisma.user.update({
        where: { email: user.email },
        data: { 
          googleId: account.providerAccountId,
          image: user.image || existingUser.image,
        },
      });
    }

    return true; // ✅ ALLOW ACCESS
  }
}
```

---

### **3. Manual Account Linking in JWT Callback**

**Location:** `lib/auth.ts` (Lines 90-139)

```typescript
async jwt({ token, user, account }) {
  if (account?.provider === 'google' && user?.email) {
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      include: { role: true },
    });

    if (dbUser) {
      // Create Account record (NextAuth's account table)
      const existingAccount = await prisma.account.findFirst({
        where: {
          provider: 'google',
          providerAccountId: account.providerAccountId,
        },
      });

      if (!existingAccount) {
        await prisma.account.create({
          data: {
            userId: dbUser.id,
            type: account.type,
            provider: 'google',
            providerAccountId: account.providerAccountId,
            access_token: account.access_token,
            // ... other OAuth tokens
          },
        });
      }

      // Set JWT token data
      token.id = dbUser.id;
      token.role = dbUser.role.name;
      token.roleId = dbUser.roleId;
      token.isActive = dbUser.isActive;
    }
  }
  return token;
}
```

---

### **4. Optimized Session Callback**

**Location:** `lib/auth.ts` (Lines 90-97)

```typescript
async session({ session, token }) {
  if (session.user && token.id) {
    // Use data from JWT token (no DB query needed)
    session.user.id = token.id as string;
    session.user.role = token.role as string;
    session.user.roleId = token.roleId as string;
    session.user.isActive = token.isActive as boolean;
  }
  return session;
}
```

**Performance:** No database query on every request - data comes from JWT token.

---

## 📋 **Error Messages**

### **NotRegistered Error**
**URL:** `/auth/error?error=NotRegistered`

**Message Shown:**
> "Your email is not registered in our system. Please contact your administrator to request access."

**Trigger:** User's Google email not found in `User` table.

---

### **AccountInactive Error**
**URL:** `/auth/error?error=AccountInactive`

**Message Shown:**
> "Your account has been deactivated. Please contact your administrator for assistance."

**Trigger:** User exists but `isActive = false`.

---

## 👥 **How to Register Users**

Users MUST be pre-registered in the database. Here are 3 methods:

### **Method 1: Database Seeding (Development)**

```bash
npm run db:seed
```

This creates:
- `admin@example.com` - SuperAgent role
- `agent1@example.com` - Agent role
- `agent2@example.com` - Agent role
- `agent3@example.com` - Agent role

### **Method 2: Manual Database Insert**

```sql
INSERT INTO User (id, email, name, roleId, isActive, createdAt, updatedAt)
VALUES (
  'cuid_generated_id',
  'john.doe@company.com',
  'John Doe',
  'role_id_from_Role_table',
  1,
  NOW(),
  NOW()
);
```

### **Method 3: Admin API (TODO - Implement)**

Create an admin endpoint:

```typescript
// app/api/admin/users/route.ts
export async function POST(req: Request) {
  const { email, name, roleId } = await req.json();
  
  const user = await prisma.user.create({
    data: {
      email,
      name,
      roleId,
      isActive: true,
    },
  });
  
  return Response.json({ success: true, user });
}
```

---

## 🧪 **Testing Guide**

### **Test Case 1: Registered User (Success)**

1. **Pre-requisite:** User exists in database
   ```bash
   npm run db:seed  # Creates admin@example.com
   ```

2. **Steps:**
   - Go to http://localhost:3000/auth/signin
   - Click "Sign in with Google"
   - Select Google account matching `admin@example.com`
   - Authorize the app

3. **Expected Result:**
   - ✅ Redirected to `/dashboard`
   - ✅ User session created
   - ✅ Role appears in dashboard (SuperAgent)

---

### **Test Case 2: Unregistered User (Denied)**

1. **Steps:**
   - Go to http://localhost:3000/auth/signin
   - Click "Sign in with Google"
   - Select Google account **NOT** in database (e.g., `random@gmail.com`)
   - Authorize the app

2. **Expected Result:**
   - ❌ Redirected to `/auth/error?error=NotRegistered`
   - ❌ Error message: "Your email is not registered..."
   - ❌ User NOT created in database
   - ❌ No access to dashboard

---

### **Test Case 3: Inactive User (Denied)**

1. **Pre-requisite:** User exists but is inactive
   ```sql
   UPDATE User SET isActive = 0 WHERE email = 'admin@example.com';
   ```

2. **Steps:**
   - Sign in with Google using `admin@example.com`

3. **Expected Result:**
   - ❌ Redirected to `/auth/error?error=AccountInactive`
   - ❌ Error message: "Your account has been deactivated..."

---

## 🔒 **Security Features**

✅ **Email Verification** - Only registered emails can sign in  
✅ **No Auto-Registration** - PrismaAdapter removed  
✅ **Active Account Check** - Inactive users blocked  
✅ **Role-Based Access** - User role from database  
✅ **Secure Token Storage** - JWT with 30-day expiry  
✅ **Google Account Linking** - Links OAuth to existing user  
✅ **Audit Trail** - Console logs access attempts  

---

## 📊 **Database Schema**

### **User Table**
```sql
User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  googleId      String?   @unique  -- Links to Google account
  roleId        String
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  role          Role      @relation(fields: [roleId])
  accounts      Account[] -- OAuth accounts (Google, etc.)
}
```

### **Account Table** (Auto-created by NextAuth)
```sql
Account {
  id                String  @id @default(cuid())
  userId            String
  provider          String  -- "google"
  providerAccountId String  -- Google user ID
  access_token      String?
  refresh_token     String?
  expires_at        Int?
  
  user              User    @relation(fields: [userId])
}
```

---

## 🌐 **Environment Variables Required**

```env
# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-32-char-secret-here"

# Google OAuth Credentials
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-secret-here"

# Database
DATABASE_URL="mysql://root@localhost:3306/e2w_lms"
```

### **How to Get Google Credentials:**

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create OAuth 2.0 Client ID
5. Application type: Web application
6. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://yourdomain.com/api/auth/callback/google` (prod)
7. Copy Client ID and Client Secret to `.env`

---

## 🚀 **Production Deployment Checklist**

Before deploying to production:

- [ ] Update `NEXTAUTH_URL` to production domain
- [ ] Generate new `NEXTAUTH_SECRET` (32+ characters)
- [ ] Update Google OAuth redirect URIs in Google Console
- [ ] Set `NODE_ENV="production"`
- [ ] Enable HTTPS (required for OAuth)
- [ ] Test Google Sign-In on production domain
- [ ] Verify error pages work correctly
- [ ] Set up user registration workflow
- [ ] Configure database backups
- [ ] Set up monitoring/logging for auth failures

---

## 🐛 **Troubleshooting**

### **Issue: "Redirect URI mismatch"**
**Solution:** Add redirect URI to Google Console:
```
http://localhost:3000/api/auth/callback/google
```

### **Issue: "User can't sign in (registered email)"**
**Check:**
1. User exists in database: `SELECT * FROM User WHERE email = '...'`
2. `isActive = true`
3. Google credentials correct in `.env`
4. Server restarted after `.env` changes

### **Issue: "Everyone can sign in (unregistered too)"**
**Check:**
1. PrismaAdapter removed from `lib/auth.ts`
2. Server restarted
3. Clear browser cookies/cache

### **Issue: "Session not persisting"**
**Check:**
1. `NEXTAUTH_SECRET` is set and consistent
2. JWT callback returns proper token data
3. Session callback maps token to session correctly

---

## 📞 **Support**

If you encounter issues:

1. Check console logs for error messages
2. Verify all environment variables are set
3. Ensure database is running and accessible
4. Test with email/password login first (to isolate Google OAuth issues)
5. Check NextAuth debug logs (enabled in development)

---

## 🎉 **Success!**

Your Google Sign-In is now **production-ready** with:
- ✅ Email verification
- ✅ Access control
- ✅ Proper error handling
- ✅ Security best practices

**Test it now:** http://localhost:3000/auth/signin

---

**Last Updated:** November 25, 2025  
**Status:** ✅ Production Ready  
**Version:** 1.0.0
