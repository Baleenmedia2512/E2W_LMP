# 🔐 OTP Authentication System - Setup Guide

## 📋 Overview

This guide will help you set up the enterprise-level 3-step OTP authentication system for E2W LMS.

## 🚀 Quick Start

### 1. Install Dependencies

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### 2. Configure Environment Variables

Copy the `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 3. Configure Email Service

Choose one of the following options:

#### Option A: Gmail SMTP (Recommended for Development)

1. Enable 2-Factor Authentication on your Google Account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Update `.env`:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-16-character-app-password"
SMTP_FROM_NAME="E2W LMS"
SMTP_FROM_EMAIL="noreply@e2wlms.com"
```

#### Option B: Custom SMTP Server

Update `.env` with your SMTP credentials:

```env
SMTP_HOST="smtp.yourserver.com"
SMTP_PORT="587"
SMTP_USER="your-smtp-username"
SMTP_PASSWORD="your-smtp-password"
```

#### Option C: Resend (Modern Alternative)

1. Sign up at https://resend.com
2. Get your API key
3. Update `.env`:

```env
RESEND_API_KEY="re_your_api_key_here"
```

**Note:** If using Resend, you'll need to modify `src/shared/lib/email/email-service.ts` to use Resend instead of Nodemailer.

### 4. Run Database Migration

Create the new OTP authentication tables:

```bash
npx prisma migrate dev --name add_otp_authentication_system
```

This will create:
- `OtpRequest` table - Stores OTP requests
- `Session` table - Manages user sessions
- `LoginActivity` table - Tracks login attempts

### 5. Generate Prisma Client

```bash
npx prisma generate
```

### 6. Start Development Server

```bash
npm run dev
```

The app will be available at http://localhost:3000

## 🎯 Features Implemented

### ✅ 3-Step Authentication Flow

1. **Welcome Screen** (`/auth/welcome`)
   - Clean, modern welcome interface
   - "Continue with Email" CTA button
   - Smooth animations

2. **Email Entry** (`/auth/email`)
   - Email validation
   - Rate limiting
   - Loading states
   - Error handling

3. **OTP Verification** (`/auth/verify`)
   - 6-digit OTP input with auto-advance
   - Paste support
   - Countdown timer (60 seconds)
   - Resend functionality
   - Attempt tracking

### ✅ Security Features

- **OTP Security**
  - Cryptographically secure OTP generation
  - Bcrypt hashing (10 rounds)
  - 5-minute expiration
  - Maximum 5 attempts per OTP
  - One-time use enforcement

- **Rate Limiting**
  - Max 3 OTP requests per email per 15 minutes
  - Max 10 requests per IP per 15 minutes
  - 60-second cooldown between resends
  - In-memory LRU cache

- **Session Management**
  - JWT tokens with 7-day expiry
  - Refresh tokens with 30-day expiry
  - Secure session storage
  - Device tracking
  - Session revocation

- **Audit Logging**
  - All login attempts logged
  - Failed attempts tracked
  - IP address recording
  - User agent tracking

### ✅ UI/UX Features

- Modern SaaS design (Stripe/Linear/Notion inspired)
- Fully responsive (mobile, tablet, desktop)
- Smooth animations with Framer Motion
- Loading states and spinners
- Error handling with toast notifications
- Keyboard navigation support
- Auto-focus and auto-advance
- Email masking (privacy)

## 📁 File Structure

```
src/
├── app/
│   ├── auth/
│   │   ├── welcome/page.tsx       # Step 1: Welcome screen
│   │   ├── email/page.tsx         # Step 2: Email entry
│   │   └── verify/page.tsx        # Step 3: OTP verification
│   │
│   └── api/auth/otp/
│       ├── send/route.ts          # Send OTP API
│       ├── verify/route.ts        # Verify OTP API
│       └── resend/route.ts        # Resend OTP API
│
├── shared/
│   ├── components/auth/
│   │   ├── OtpInput.tsx           # 6-digit OTP input component
│   │   ├── OtpTimer.tsx           # Countdown timer
│   │   └── AuthLayout.tsx         # Shared auth layout
│   │
│   └── lib/
│       ├── auth/
│       │   ├── otp-utils.ts       # OTP generation & validation
│       │   ├── rate-limiter.ts    # Rate limiting logic
│       │   └── session-manager.ts # Session utilities
│       │
│       └── email/
│           └── email-service.ts   # Email sending service
│
└── prisma/
    └── schema.prisma              # Database schema (updated)
```

## 🧪 Testing

### Test the Email Service

Create a test script `scripts/test-email.ts`:

```typescript
import { sendOtpEmail } from '@/shared/lib/email/email-service';

async function testEmail() {
  const result = await sendOtpEmail('test@example.com', '123456');
  console.log('Email sent:', result);
}

testEmail();
```

Run:
```bash
npx tsx scripts/test-email.ts
```

### Test OTP Flow

1. Navigate to http://localhost:3000
2. Click "Continue with Email"
3. Enter a registered email
4. Check your email for the OTP code
5. Enter the 6-digit code
6. Verify successful login

### Test Rate Limiting

Try sending multiple OTP requests quickly to verify rate limiting works.

## 🔧 Configuration Options

### OTP Settings

Adjust in `.env`:

```env
OTP_EXPIRY_MINUTES="5"              # OTP valid for 5 minutes
OTP_MAX_ATTEMPTS="5"                # 5 attempts per OTP
OTP_RESEND_COOLDOWN_SECONDS="60"   # 60 seconds between resends
OTP_RATE_LIMIT_PER_EMAIL="3"       # 3 requests per 15 min per email
OTP_RATE_LIMIT_WINDOW_MINUTES="15" # 15 minute window
```

### Session Settings

```env
SESSION_EXPIRY_DAYS="7"            # Sessions expire after 7 days
REFRESH_TOKEN_EXPIRY_DAYS="30"    # Refresh tokens expire after 30 days
```

## 🚨 Troubleshooting

### Email Not Sending

1. **Check SMTP credentials** - Verify username and password
2. **Check firewall** - Ensure port 587/465 is open
3. **Check spam folder** - OTP emails might be marked as spam
4. **Test connection**:

```bash
npx tsx -e "import {verifyEmailConfig} from './src/shared/lib/email/email-service'; verifyEmailConfig();"
```

### Database Errors

If you get Prisma errors:

```bash
npx prisma generate
npx prisma migrate reset
npx prisma migrate dev
```

### Rate Limiting Issues

If rate limiting is too aggressive during development, you can temporarily increase limits in `.env`:

```env
OTP_RATE_LIMIT_PER_EMAIL="10"
OTP_RATE_LIMIT_WINDOW_MINUTES="5"
```

## 📦 Production Deployment

### Environment Variables

Ensure all environment variables are set in your production environment:

```bash
# Critical production settings
JWT_SECRET="use-a-strong-random-secret"
SMTP_PASSWORD="your-production-smtp-password"
DATABASE_URL="your-production-database-url"
NODE_ENV="production"
```

### Security Checklist

- [ ] Use strong JWT_SECRET (64+ characters)
- [ ] Enable HTTPS only
- [ ] Use production SMTP credentials
- [ ] Set secure CORS policies
- [ ] Enable CSP headers
- [ ] Review rate limit settings
- [ ] Set up monitoring for failed logins
- [ ] Configure backup email service

### Performance Optimization

1. **Database Indexing** - Already configured in Prisma schema
2. **Email Queue** - Consider using a job queue for emails in high-traffic scenarios
3. **Cache** - LRU cache is already implemented for rate limiting
4. **CDN** - Serve static assets via CDN

## 🎓 Additional Resources

### API Endpoints

- `POST /api/auth/otp/send` - Send OTP to email
- `POST /api/auth/otp/verify` - Verify OTP code
- `POST /api/auth/otp/resend` - Resend OTP code

### Database Models

```prisma
model OtpRequest {
  id         String   @id @default(cuid())
  email      String
  hashedOtp  String
  expiresAt  DateTime
  attempts   Int      @default(0)
  used       Boolean  @default(false)
  createdAt  DateTime @default(now())
  ipAddress  String?
  userAgent  String?
}

model Session {
  id             String   @id @default(cuid())
  userId         String
  token          String   @unique
  refreshToken   String?  @unique
  deviceInfo     String?
  ipAddress      String?
  userAgent      String?
  lastActivityAt DateTime @default(now())
  expiresAt      DateTime
  createdAt      DateTime @default(now())
}

model LoginActivity {
  id            String   @id @default(cuid())
  userId        String?
  email         String
  action        String   # 'otp_sent', 'otp_verified', 'login_success', 'login_failed'
  status        String   # 'success', 'failed'
  failureReason String?
  ipAddress     String?
  userAgent     String?
  metadata      String?
  createdAt     DateTime @default(now())
}
```

## 🤝 Support

For issues or questions, check:

1. Application logs in terminal
2. Browser console for frontend errors
3. Database logs for Prisma errors
4. Email service logs for delivery issues

## 🎉 Success!

Your enterprise OTP authentication system is now ready!

Navigate to http://localhost:3000 to test the new authentication flow.
