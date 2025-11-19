# 🔐 Login Credentials for E2W LMS

## Development Sign-In

The application now supports **Email/Password authentication** for local development!

### How to Sign In

1. Navigate to: **http://localhost:3000**
2. You'll be redirected to the sign-in page
3. Choose either:
   - **Email/Password Login** (recommended for development)
   - Google Sign-In (requires Google OAuth setup)

---

## 📧 Test Accounts

All test accounts use the same password: **`demo123`**

### Available Users

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| **admin@example.com** | demo123 | SuperAgent | Full system access, can assign leads |
| **agent1@example.com** | demo123 | Agent | Standard agent access |
| **agent2@example.com** | demo123 | Agent | Standard agent access |
| **agent3@example.com** | demo123 | Agent | Standard agent access |

---

## 🚀 Quick Login Steps

1. Open **http://localhost:3000**
2. On the sign-in page, enter:
   - **Email:** `admin@example.com`
   - **Password:** `demo123`
3. Click **"Sign in with Email"**
4. You'll be redirected to the Dashboard!

---

## ⚡ Features by Role

### SuperAgent (admin@example.com)
- ✅ View all leads
- ✅ Create new leads
- ✅ Assign leads to agents (manual)
- ✅ Auto-assign leads
- ✅ View team DSR reports
- ✅ Manage call logs
- ✅ Schedule follow-ups
- ✅ Access all dashboard stats

### Agent (agent1/2/3@example.com)
- ✅ View assigned leads
- ✅ Log calls
- ✅ Update lead status
- ✅ Schedule follow-ups
- ✅ View personal DSR
- ✅ Access personal dashboard stats

---

## 🔒 Security Notes

- ⚠️ **Development Only**: The email/password authentication is for development/testing purposes only
- 🔐 Password is hardcoded as `demo123` in development mode
- 🌐 For production, configure Google OAuth credentials in `.env`
- 🛡️ In production, the credentials provider will be disabled

---

## 🛠️ Troubleshooting

### Can't Sign In?
1. Ensure the server is running: `npm run dev`
2. Check database is seeded: `npm run db:seed`
3. Verify you're using the correct email from the list above
4. Password must be exactly: `demo123` (lowercase, no spaces)

### Google Sign-In Error?
- Google OAuth is not configured (normal for local dev)
- Use the **Email/Password** option instead
- To enable Google OAuth, add credentials to `.env`

---

## 📱 After Login

Once logged in, you'll see:
- **Dashboard** with real-time stats
- **Recent Leads** table
- **Today's Follow-ups**
- Navigation sidebar with role-based menu items

---

**Enjoy testing the E2W Lead Management System! 🎉**
