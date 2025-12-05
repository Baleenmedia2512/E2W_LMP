# 🎯 E2W Lead Management Platform (LMP)

A comprehensive Lead Management System built with Next.js, TypeScript, and Prisma.

## ✨ Features

- 🎯 **Complete Lead Management** - Track leads from capture to conversion
- 📞 **Call Logging** - Record and track all customer interactions
- 📅 **Follow-up Scheduling** - Never miss a follow-up
- 👥 **User & Role Management** - Agent, SuperAgent, Finance, HR, Procurement roles
- 📊 **DSR (Daily Sales Report)** - Track team performance
- 🔔 **Real-time Notifications** - Stay updated on lead activities
- 🔍 **Advanced Filtering** - Find leads quickly
- 📱 **Responsive Design** - Works on all devices
- **🆕 Meta Lead Ads Integration** - Automatic lead capture from Facebook/Instagram ads

## 🚀 Meta Lead Ads Integration

**NEW!** Automatically capture leads from your Facebook and Instagram ad campaigns directly into your CRM.

### Features
- ✅ Real-time webhook integration (< 2 seconds)
- ✅ Backup polling system (100% reliability)
- ✅ Automatic deduplication
- ✅ Round-robin agent assignment
- ✅ No database schema changes required

### Quick Start
See **[WEBHOOK_SETUP_QUICK.md](./WEBHOOK_SETUP_QUICK.md)** for 5-minute setup guide.

### Full Documentation
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Implementation overview
- **[WEBHOOK_CREATION_PROCEDURE.md](./WEBHOOK_CREATION_PROCEDURE.md)** - Detailed setup guide
- **[META_INTEGRATION_GUIDE.md](./META_INTEGRATION_GUIDE.md)** - Complete reference
- **[META_QUICK_REFERENCE.md](./META_QUICK_REFERENCE.md)** - Quick reference card

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** MySQL with Prisma ORM
- **UI:** Chakra UI
- **Authentication:** JWT + Google OAuth
- **State Management:** React Context
- **Forms:** Zod validation

## 📋 Prerequisites

- Node.js 18.x or higher
- MySQL 8.x
- npm 9.x or higher

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/Baleenmedia2512/E2W_LMP.git
cd E2W_LMP
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
```bash
cp .env.example .env
```

Edit `.env` and configure:
```env
# Database
DATABASE_URL="mysql://root:@localhost:3306/e2w_lms"

# JWT & NextAuth
JWT_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Meta Lead Ads (if using Meta integration)
META_APP_SECRET="your-facebook-app-secret"
META_WEBHOOK_VERIFY_TOKEN="E2W_LMP_META_WEBHOOK_2025"
META_ACCESS_TOKEN="your-page-access-token"
META_PAGE_ID="your-facebook-page-id"
```

### 4. Setup Database
```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database (optional)
npm run seed
```

### 5. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📂 Project Structure

```
E2W_LMP/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API routes
│   │   │   ├── auth/             # Authentication
│   │   │   ├── leads/            # Lead management
│   │   │   ├── webhooks/         # Meta webhook endpoint
│   │   │   └── cron/             # Scheduled jobs
│   │   ├── dashboard/            # Dashboard pages
│   │   ├── login/                # Login page
│   │   └── layout.tsx            # Root layout
│   ├── features/                 # Feature modules
│   │   ├── dsr/                  # Daily Sales Report
│   │   └── leads/                # Lead management
│   ├── shared/                   # Shared resources
│   │   ├── components/           # Reusable components
│   │   ├── hooks/                # Custom hooks
│   │   ├── lib/                  # Utilities & libraries
│   │   │   └── meta/             # Meta integration utilities
│   │   └── types/                # TypeScript types
│   └── styles/                   # Global styles
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── seed.js                   # Database seeder
├── public/                       # Static assets
└── package.json                  # Dependencies
```

## 📜 Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio
npm run seed             # Seed database

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors
npm run format           # Format code with Prettier
npm run type-check       # TypeScript type checking
```

## 🔐 Default Users

After seeding, you can login with:

| Role | Email | Password |
|------|-------|----------|
| SuperAgent | agent@e2w.com | admin123 |
| Agent | agent2@e2w.com | admin123 |

## 📊 Key Features Explained

### Lead Management
- Create, update, and track leads
- Multiple lead sources (Website, Meta, Referral, Direct, WhatsApp, Cold Call)
- Lead status tracking (new, followup, qualified, won, lost, unreach, unqualified)
- Priority levels (low, medium, high)
- Auto-assignment with round-robin

### Call Logging
- Track call attempts
- Record call duration and remarks
- Call status (completed, busy, ring_not_response)
- Customer requirement capture

### Follow-ups
- Schedule follow-ups with specific dates/times
- Track completion status
- Priority-based organization
- Automatic reminders

### DSR (Daily Sales Report)
- View team performance metrics
- Track calls, conversions, and follow-ups
- Date-based filtering
- Export capabilities

### Notifications
- Real-time lead assignments
- Follow-up reminders
- Status change alerts
- Activity updates

### Meta Integration (NEW!)
- Automatic lead capture from Facebook/Instagram ads
- Real-time webhook + backup polling
- Deduplication to prevent duplicates
- Seamless integration with existing workflow

## 🔒 Security

- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Environment variable protection
- HMAC signature validation for webhooks

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Leads
- `GET /api/leads` - Get all leads (with filters)
- `POST /api/leads` - Create new lead
- `GET /api/leads/[id]` - Get lead details
- `PUT /api/leads/[id]` - Update lead
- `DELETE /api/leads/[id]` - Delete lead

### Meta Integration (Webhook - Push-based)
- `GET /api/webhooks/meta-leads` - Webhook verification (Meta calls this once)
- `POST /api/webhooks/meta-leads` - Real-time lead receiver (Meta pushes leads here instantly)
- `GET /api/webhooks/meta-leads/test` - Test webhook configuration and connectivity

### Other
- `GET /api/calls` - Get call logs
- `POST /api/followups` - Create follow-up
- `GET /api/notifications` - Get notifications
- `GET /api/activity` - Get activity history

## 🧪 Testing

### Test Meta Webhook Integration
```powershell
# Run complete verification
.\verify-meta-integration.ps1

# Test webhook endpoint
.\test-meta-webhook.ps1
```

## 🚀 Production Deployment

### Vercel (Recommended)

1. **Push to GitHub**
```bash
git push origin main
```

2. **Connect to Vercel**
- Import project in Vercel Dashboard
- Configure environment variables
- Deploy

3. **Setup Meta Webhook**
- Update callback URL to production domain
- Configure cron for polling

See **[WEBHOOK_CREATION_PROCEDURE.md](./WEBHOOK_CREATION_PROCEDURE.md)** for detailed Meta setup.

### Other Platforms

Ensure:
- Node.js 18+ runtime
- MySQL database
- Environment variables configured
- HTTPS enabled (required for Meta webhooks)

## 📈 Roadmap

- [ ] WhatsApp integration
- [ ] Email campaigns
- [ ] Advanced analytics dashboard
- [ ] Mobile app
- [ ] AI-powered lead scoring
- [ ] Voice recording integration
- [ ] Multi-language support

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is proprietary software owned by Baleen Media.

## 📞 Support

For support and questions:
- **Documentation:** See `/docs` folder
- **Meta Integration:** See `META_INTEGRATION_GUIDE.md`
- **Issues:** Create GitHub issue

## 🙏 Acknowledgments

- Next.js Team
- Chakra UI
- Prisma
- Meta (Facebook) Developer Platform

---

**Built with ❤️ by Baleen Media**

**Version:** 1.0.0  
**Last Updated:** November 28, 2025
