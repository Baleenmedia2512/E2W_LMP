# E2W Lead Management System (LMS)

A production-ready, full-stack Lead Management System built with Next.js, TypeScript, Prisma, MySQL, and Chakra UI.

## 🚀 Features

### Core Functionality
- ✅ **Google OAuth Authentication** - Secure sign-in with Google accounts only
- ✅ **Role-Based Access Control** - 5 roles: Agent, SuperAgent, Finance, HR, Procurement
- ✅ **Lead Management** - Complete CRUD operations with auto/manual assignment
- ✅ **Today's Dashboard** - Real-time stats with 30s auto-refresh
- ✅ **Call Workflow** - Start/end calls, remarks, status updates, attempt tracking
- ✅ **Follow-up System** - Schedule and auto-trigger follow-ups at 9 AM
- ✅ **DSR (Daily Sales Report)** - Individual & team performance with CSV export
- ✅ **Search & Filters** - Advanced lead filtering and search
- ✅ **Notifications** - In-app notification badges and alerts
- ✅ **Undo Feature** - Undo last action within 60 seconds
- ✅ **Audit Logging** - Complete action history and traceability

### Technical Highlights
- 🎨 **Modern UI** - Sleek, accessible design with Chakra UI theme
- 📱 **Responsive** - Mobile-first design that works on all devices
- ⚡ **Fast** - Optimistic UI updates with SWR caching
- 🔒 **Secure** - Parameterized queries, JWT validation, CSRF protection
- 🧪 **Tested** - Unit tests (Jest) + E2E tests (Playwright)
- 🚢 **Production-Ready** - CI/CD pipeline, error boundaries, logging
- ☁️ **Serverless** - Deploys to Vercel with zero config changes

## 📋 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| UI Framework | Chakra UI with custom theme |
| Backend | Next.js API Routes (Serverless Functions) |
| Database | MySQL 8.0+ |
| ORM | Prisma 5.20 |
| Authentication | NextAuth.js (Google OAuth) |
| State Management | SWR (React Hooks) |
| Testing | Jest + React Testing Library + Playwright |
| Linting | ESLint + Prettier |
| CI/CD | GitHub Actions |
| Deployment | Vercel |

## 🎨 Theme Colors

- **Primary Brand**: `#9c5342`
- **Dark**: `#0b1316`
- **Neutral**: `#b4a097`
- **Warm**: `#7a5f58`
- **Cool**: `#8c9b96`

## 📦 Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **MySQL** >= 8.0
- **Google OAuth Credentials** (Client ID & Secret)

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Baleenmedia2512/E2W_LMP.git
cd E2W_LMP
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
# Database
DATABASE_URL="mysql://root:@localhost:3306/e2w_lms"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"

# Google OAuth (Get from Google Cloud Console)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Optional: Test user for seeding
GOOGLE_TEST_EMAIL="admin@example.com"
GOOGLE_TEST_ID="test-google-id"

# App Configuration
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Setup Database

Create the MySQL database:

```bash
mysql -u root -p
CREATE DATABASE e2w_lms;
exit;
```

Run Prisma migrations:

```bash
npm run migrate:dev
```

### 5. Seed the Database

Populate with test data (roles, users, sample leads):

```bash
npm run db:seed
```

This creates:
- 5 roles (Agent, SuperAgent, Finance, HR, Procurement)
- 4 test users (1 SuperAgent, 3 Agents)
- 15 sample leads with various statuses
- Call logs, follow-ups, and assignments

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🧪 Testing

### Run Unit Tests

```bash
npm run test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run E2E Tests

```bash
npm run test:e2e
```

### Run E2E Tests in UI Mode

```bash
npm run test:e2e:ui
```

## 🚀 Deployment

### Deploy to Vercel

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Set Environment Variables in Vercel Dashboard**:
   - `DATABASE_URL` - Your production MySQL connection string
   - `NEXTAUTH_URL` - Your production URL (e.g., https://your-app.vercel.app)
   - `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
   - `GOOGLE_CLIENT_ID` - Your Google OAuth Client ID
   - `GOOGLE_CLIENT_SECRET` - Your Google OAuth Client Secret

5. **Run Database Migrations**:
   ```bash
   npx prisma migrate deploy
   ```

### Production Checklist

- [ ] Set strong `NEXTAUTH_SECRET`
- [ ] Configure production `DATABASE_URL` with connection pooling
- [ ] Add production Google OAuth redirect URLs
- [ ] Enable Vercel Analytics (optional)
- [ ] Set up Sentry for error tracking (optional)
- [ ] Configure CORS if using external APIs
- [ ] Review and adjust rate limiting
- [ ] Set up database backups
- [ ] Configure custom domain (optional)

## 📁 Project Structure

```
E2W_LMP/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI/CD
├── app/
│   ├── api/                    # API Routes (Serverless)
│   │   ├── auth/
│   │   ├── leads/
│   │   ├── assign/
│   │   ├── dashboard/
│   │   ├── calls/
│   │   ├── followups/
│   │   ├── dsr/
│   │   ├── undo/
│   │   └── notifications/
│   ├── dashboard/              # Dashboard pages
│   ├── auth/                   # Auth pages
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
├── components/
│   ├── layout/                 # Layout components
│   ├── ui/                     # Reusable UI components
│   ├── forms/                  # Form components
│   └── tables/                 # Table components
├── lib/
│   ├── prisma.ts               # Prisma client (with pooling)
│   ├── auth.ts                 # NextAuth configuration
│   ├── roles.ts                # Role permissions & helpers
│   ├── validations.ts          # Zod schemas
│   ├── errors.ts               # Error handling
│   ├── swr.ts                  # SWR hooks
│   ├── theme.ts                # Chakra UI theme
│   └── api-middleware.ts       # API middleware
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Seed script
├── tests/
│   ├── unit/                   # Jest unit tests
│   └── e2e/                    # Playwright E2E tests
├── types/
│   ├── index.ts                # TypeScript types
│   └── next-auth.d.ts          # NextAuth type extensions
├── .env.example                # Environment variables template
├── jest.config.js              # Jest configuration
├── playwright.config.ts        # Playwright configuration
├── next.config.js              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
├── .eslintrc.json              # ESLint configuration
├── .prettierrc                 # Prettier configuration
└── package.json                # Dependencies & scripts
```

## 🔑 Default Test Users

After seeding, you can test with:

| Email | Role | Password |
|-------|------|----------|
| admin@example.com | SuperAgent | Use Google OAuth |
| agent1@example.com | Agent | Use Google OAuth |
| agent2@example.com | Agent | Use Google OAuth |

**Note**: In development, you'll need to configure Google OAuth or modify the seed script to use your actual Google IDs.

## 📊 Database Models

- **User** - System users with Google OAuth
- **Role** - User roles with permissions
- **Lead** - Lead information
- **LeadRaw** - Raw lead data from external sources
- **Assignment** - Lead assignment history
- **CallLog** - Call tracking with attempt counter
- **FollowUp** - Scheduled follow-ups
- **DSRExport** - DSR export records
- **AuditLog** - Complete audit trail
- **UndoLog** - Undo action tracking
- **Notification** - In-app notifications

## 🎯 API Endpoints

### Authentication
- `GET/POST /api/auth/[...nextauth]` - NextAuth endpoints
- `GET /api/auth/session` - Get current session

### Leads
- `GET /api/leads` - List leads (with filters & pagination)
- `POST /api/leads` - Create new lead
- `GET /api/leads/[id]` - Get lead details
- `PUT /api/leads/[id]` - Update lead
- `DELETE /api/leads/[id]` - Delete lead

### Assignment
- `POST /api/assign` - Manually assign lead
- `GET /api/assign` - Auto-assign unassigned leads

### Dashboard
- `GET /api/dashboard` - Dashboard statistics

### Calls
- `GET /api/calls` - List call logs
- `POST /api/calls` - Create call log

### Follow-ups
- `GET /api/followups` - List follow-ups
- `POST /api/followups` - Create follow-up
- `PUT /api/followups/[id]` - Update follow-up

### DSR
- `GET /api/dsr` - Generate DSR report
- `POST /api/dsr` - Export DSR to CSV

### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications` - Mark as read

### Undo
- `GET /api/undo` - Get available undo actions
- `POST /api/undo` - Undo last action

## 🔐 Security Features

- ✅ Google OAuth only (no password storage)
- ✅ Session-based authentication
- ✅ Role-based access control (RBAC)
- ✅ API route protection with middleware
- ✅ Parameterized database queries (SQL injection prevention)
- ✅ CSRF protection (NextAuth built-in)
- ✅ Input validation with Zod
- ✅ Rate limiting ready (configure in production)
- ✅ Secure session cookies
- ✅ Audit logging for compliance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting, missing semi colons, etc
refactor: code refactoring
test: adding tests
chore: maintain
```

## 📝 License

This project is proprietary and confidential.

## 🆘 Support

For issues, questions, or feature requests:
- Create an issue in the GitHub repository
- Contact the development team

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Chakra UI for the beautiful component library
- Prisma for the excellent ORM
- All open-source contributors

---

**Built with ❤️ by E2W Development Team**
