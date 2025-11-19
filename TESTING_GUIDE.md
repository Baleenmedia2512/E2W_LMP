# 🧪 E2W LMS - Testing & Running Guide

Complete guide for testing, running, and deploying the Lead Management System.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Running the Application](#running-the-application)
4. [Testing](#testing)
5. [Deployment](#deployment)
6. [Troubleshooting](#troubleshooting)
7. [Performance Testing](#performance-testing)

---

## ✅ Prerequisites

### System Requirements

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MySQL**: v8.0 or higher
- **Operating System**: Windows, macOS, or Linux

### Verify Installation

```bash
# Check Node.js version
node --version  # Should be >= 18.0.0

# Check npm version
npm --version   # Should be >= 9.0.0

# Check MySQL
mysql --version # Should be >= 8.0
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Create **OAuth 2.0 Client ID** credentials
5. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
6. Copy **Client ID** and **Client Secret**

---

## 🚀 Initial Setup

### Step 1: Clone & Install

```bash
# Clone the repository
git clone https://github.com/Baleenmedia2512/E2W_LMP.git
cd E2W_LMP

# Install dependencies
npm install
```

### Step 2: Configure Environment

```bash
# Copy environment template
cp .env.example .env
```

Edit `.env` file with your values:

```env
# Database Configuration
DATABASE_URL="mysql://root:yourpassword@localhost:3306/e2w_lms"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Test User (for seeding)
GOOGLE_TEST_EMAIL="youremail@gmail.com"
GOOGLE_TEST_ID="your-google-user-id"

# App Settings
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Step 3: Database Setup

#### Start MySQL (if not running)

**Windows (XAMPP)**:
```powershell
# Start XAMPP MySQL
Start-Process "C:\xampp\mysql_start.bat"

# Or use XAMPP Control Panel
```

**macOS/Linux**:
```bash
# Start MySQL service
sudo systemctl start mysql  # Linux
brew services start mysql   # macOS
```

#### Create Database

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE e2w_lms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Verify
SHOW DATABASES;

# Exit
exit;
```

### Step 4: Run Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npm run migrate:dev

# Verify tables created
npx prisma studio  # Opens GUI at http://localhost:5555
```

### Step 5: Seed Database

```bash
# Seed with test data
npm run db:seed
```

**What gets seeded:**
- ✅ 5 Roles (Agent, SuperAgent, Finance, HR, Procurement)
- ✅ 4 Test Users (1 SuperAgent, 3 Agents)
- ✅ 15 Sample Leads (various statuses and sources)
- ✅ 10 Call Logs
- ✅ 8 Follow-ups (3 for today)
- ✅ Assignment records
- ✅ Audit logs
- ✅ Sample notifications

---

## 🏃 Running the Application

### Development Mode

```bash
# Start development server
npm run dev

# Application runs at: http://localhost:3000
```

**Features in Development:**
- ✅ Hot Module Replacement (HMR)
- ✅ Detailed error messages
- ✅ Source maps
- ✅ Database query logging

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm run start
```

### Alternative Commands

```bash
# Open Prisma Studio (Database GUI)
npm run prisma:studio

# Reset database (WARNING: Deletes all data)
npm run migrate:reset

# Push schema changes without migrations (dev only)
npm run db:push
```

---

## 🧪 Testing

### Test Structure

```
tests/
├── unit/           # Unit tests (Jest)
│   ├── leads.test.ts
│   ├── auth.test.ts
│   └── validations.test.ts
└── e2e/            # End-to-end tests (Playwright)
    ├── app.spec.ts
    ├── leads.spec.ts
    └── dashboard.spec.ts
```

### Unit Tests (Jest)

#### Run All Unit Tests

```bash
npm run test
```

#### Run Tests in Watch Mode

```bash
npm run test:watch
```

#### Run Tests with Coverage

```bash
npm run test:coverage

# Coverage report generated in: ./coverage/
# View HTML report: ./coverage/lcov-report/index.html
```

#### Run Specific Test File

```bash
npx jest tests/unit/leads.test.ts
```

#### Coverage Thresholds

The project enforces minimum coverage:
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### E2E Tests (Playwright)

#### Install Playwright Browsers (First Time)

```bash
npx playwright install
```

#### Run E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode (recommended for development)
npm run test:e2e:ui

# Run specific browser
npx playwright test --project=chromium

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific test file
npx playwright test tests/e2e/app.spec.ts
```

#### E2E Test Reports

```bash
# View last test report
npx playwright show-report

# Reports saved in: ./playwright-report/
```

### Test Database Setup

For testing, use a separate database:

```env
# .env.test
DATABASE_URL="mysql://root:@localhost:3306/e2w_lms_test"
```

```bash
# Create test database
mysql -u root -p -e "CREATE DATABASE e2w_lms_test;"

# Run migrations for test DB
DATABASE_URL="mysql://root:@localhost:3306/e2w_lms_test" npx prisma migrate deploy
```

### Manual Testing Checklist

#### 1. Authentication Flow
- [ ] Navigate to `/` - redirects to `/auth/signin`
- [ ] Click "Sign in with Google"
- [ ] Complete Google OAuth flow
- [ ] Verify redirect to `/dashboard`
- [ ] Check user profile in sidebar
- [ ] Test logout functionality

#### 2. Dashboard
- [ ] View dashboard statistics
- [ ] Check "New Leads Today" card
- [ ] Check "Follow-ups Due" card
- [ ] Check "Calls Today" card
- [ ] Check "Conversions Today" card
- [ ] Verify auto-refresh (wait 30 seconds)
- [ ] Click refresh button manually

#### 3. Leads Management
- [ ] Navigate to Leads page
- [ ] View lead list
- [ ] Search for leads
- [ ] Filter by status
- [ ] Filter by source
- [ ] Create new lead
- [ ] Edit existing lead
- [ ] Delete lead
- [ ] Test undo feature (within 60s)

#### 4. Lead Assignment
- [ ] Assign lead to agent
- [ ] Test auto-assign feature
- [ ] Verify notification sent to assigned agent

#### 5. Call Management
- [ ] Start a call
- [ ] Add remarks
- [ ] Update lead status
- [ ] End call
- [ ] Verify call log created
- [ ] Check attempt number incremented

#### 6. Follow-ups
- [ ] Schedule follow-up
- [ ] View today's follow-ups
- [ ] Complete follow-up
- [ ] Edit follow-up time
- [ ] Cancel follow-up

#### 7. DSR (Daily Sales Report)
- [ ] Generate individual DSR
- [ ] Generate team DSR (SuperAgent only)
- [ ] Export to CSV
- [ ] Verify data accuracy

#### 8. Notifications
- [ ] Check notification bell badge
- [ ] View notifications dropdown
- [ ] Mark notification as read
- [ ] Mark all as read

#### 9. Role-Based Access
- [ ] Test as Agent (limited access)
- [ ] Test as SuperAgent (full access)
- [ ] Verify role-specific features

---

## 🚀 Deployment

### Deploy to Vercel (Recommended)

#### Option 1: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

#### Option 2: GitHub Integration

1. Push code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Import Project"
4. Select your GitHub repository
5. Configure:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

#### Set Environment Variables in Vercel

Go to Project Settings → Environment Variables:

```env
DATABASE_URL=mysql://user:pass@host:3306/database
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=<generate-secure-secret>
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
NODE_ENV=production
```

#### Run Database Migrations in Production

```bash
# After deployment
vercel env pull .env.production
npx prisma migrate deploy
npx prisma generate
```

### Deploy to Other Platforms

#### Railway.app

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize
railway init

# Deploy
railway up
```

#### Docker Deployment

```dockerfile
# Dockerfile (create this file)
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
# Build Docker image
docker build -t e2w-lms .

# Run container
docker run -p 3000:3000 --env-file .env e2w-lms
```

### Production Checklist

- [ ] Set strong `NEXTAUTH_SECRET` (min 32 characters)
- [ ] Use production database with connection pooling
- [ ] Configure Google OAuth redirect URIs
- [ ] Enable HTTPS/SSL
- [ ] Set up database backups
- [ ] Configure error tracking (Sentry)
- [ ] Enable monitoring and analytics
- [ ] Review and set rate limits
- [ ] Configure CORS if needed
- [ ] Test all critical flows in production
- [ ] Set up CI/CD pipeline
- [ ] Configure custom domain
- [ ] Review security headers

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Error

**Error**: `Can't reach database server`

**Solutions**:
```bash
# Check MySQL is running
sudo systemctl status mysql  # Linux
brew services list           # macOS

# Verify DATABASE_URL is correct
echo $DATABASE_URL

# Test connection
mysql -u root -p -e "SELECT 1;"

# Check if port 3306 is open
netstat -an | grep 3306
```

#### 2. Prisma Client Not Found

**Error**: `Cannot find module '@prisma/client'`

**Solution**:
```bash
npx prisma generate
npm install @prisma/client
```

#### 3. NextAuth Session Error

**Error**: `[next-auth][error][SESSION_ERROR]`

**Solutions**:
```bash
# Regenerate NEXTAUTH_SECRET
openssl rand -base64 32

# Clear cookies and restart
rm -rf .next
npm run dev
```

#### 4. Google OAuth Redirect Error

**Error**: `redirect_uri_mismatch`

**Solution**:
1. Check Google Cloud Console → OAuth 2.0 Client
2. Add authorized redirect URI:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://yourdomain.com/api/auth/callback/google` (prod)

#### 5. Port 3000 Already in Use

**Windows**:
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

**macOS/Linux**:
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9
```

#### 6. TypeScript Errors

```bash
# Clear TypeScript cache
rm -rf .next node_modules/.cache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Type check
npm run type-check
```

#### 7. Migration Errors

```bash
# Reset migrations (WARNING: Deletes data)
npx prisma migrate reset

# Or manually drop and recreate
mysql -u root -p -e "DROP DATABASE e2w_lms; CREATE DATABASE e2w_lms;"
npm run migrate:dev
```

### Debug Mode

#### Enable Verbose Logging

```env
# .env
LOG_LEVEL=debug
DATABASE_LOGGING=true
```

```bash
# Run with debug
NODE_ENV=development npm run dev
```

#### Prisma Studio for Database Inspection

```bash
npx prisma studio
# Opens at http://localhost:5555
```

### Performance Issues

#### Check Database Query Performance

```bash
# Enable query logging
# In prisma/schema.prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
  
  # Add this for slow query log
  # log = ["query", "info", "warn", "error"]
}
```

#### Optimize Build

```bash
# Analyze bundle size
npm install -g @next/bundle-analyzer

# Build with analyzer
ANALYZE=true npm run build
```

---

## ⚡ Performance Testing

### Load Testing with k6

```bash
# Install k6
brew install k6  # macOS
choco install k6 # Windows

# Create test script (loadtest.js)
# Run test
k6 run loadtest.js
```

### Lighthouse Audit

```bash
# Install Lighthouse
npm install -g lighthouse

# Run audit
lighthouse http://localhost:3000 --view
```

### Expected Performance Metrics

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1

---

## 📊 Monitoring

### Add Application Monitoring

#### Vercel Analytics

```bash
npm install @vercel/analytics

# Add to app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

#### Sentry Error Tracking

```bash
npm install @sentry/nextjs

# Initialize
npx @sentry/wizard@latest -i nextjs
```

---

## 🎯 Quick Reference

### Commonly Used Commands

```bash
# Development
npm run dev                  # Start dev server
npm run build               # Build for production
npm run start               # Start production server

# Database
npm run migrate:dev         # Run migrations (dev)
npm run migrate:deploy      # Run migrations (prod)
npm run db:seed            # Seed database
npm run prisma:studio      # Open Prisma Studio

# Testing
npm run test               # Run unit tests
npm run test:coverage      # Run with coverage
npm run test:e2e          # Run E2E tests
npm run test:e2e:ui       # Run E2E in UI mode

# Code Quality
npm run lint              # Run ESLint
npm run lint:fix          # Fix ESLint errors
npm run format            # Run Prettier
npm run type-check        # TypeScript check
```

### Important URLs (Development)

- **App**: http://localhost:3000
- **Prisma Studio**: http://localhost:5555
- **API Docs**: http://localhost:3000/api/docs (if implemented)

---

## ✅ Pre-Launch Checklist

### Before Going Live

- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Coverage > 70%
- [ ] Database migrations up to date
- [ ] Environment variables configured
- [ ] Google OAuth configured
- [ ] SSL/HTTPS enabled
- [ ] Error tracking configured
- [ ] Performance tested
- [ ] Security audit completed
- [ ] Backup strategy in place
- [ ] Monitoring enabled
- [ ] Documentation complete

---

## 🆘 Getting Help

### Resources

- **Documentation**: Check `/README.md`
- **Issues**: GitHub Issues
- **API Reference**: `/docs/API.md`
- **Architecture**: `/docs/ARCHITECTURE.md`

### Support Contacts

- **Technical Issues**: Create GitHub Issue
- **Security Concerns**: Email security@e2w.com
- **General Questions**: Contact dev team

---

**Last Updated**: November 2025  
**Version**: 1.0.0  
**Maintained by**: E2W Development Team

---

## 🎉 Success!

If everything is working:
1. You should see the sign-in page at http://localhost:3000
2. Sign in with Google OAuth
3. Access the dashboard with real-time stats
4. Create, manage, and assign leads
5. Track calls and schedule follow-ups
6. Generate DSR reports

**Happy Testing! 🚀**
