# Vercel Deployment Guide

## Prerequisites
✅ Build is successful locally
✅ MySQL database (use PlanetScale, Railway, or any MySQL hosting)
✅ Vercel account

## Steps to Deploy

### 1. Set Up Database
You need a MySQL database. Options:
- **PlanetScale** (Recommended): https://planetscale.com/ - Free tier available
- **Railway**: https://railway.app/
- **AWS RDS**, **Google Cloud SQL**, or any MySQL hosting

### 2. Configure Environment Variables on Vercel

Go to your Vercel project dashboard (https://vercel.com/baleen-medias-projects/e2-w-lmp) and add these environment variables:

#### Required Variables:
```bash
# Database (REQUIRED)
DATABASE_URL="mysql://user:password@host:3306/database"

# JWT & Auth (REQUIRED)
JWT_SECRET="generate-a-strong-random-string-here"
NEXTAUTH_SECRET="generate-another-strong-random-string-here"
NEXTAUTH_URL="https://your-app-name.vercel.app"

# App Configuration
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-app-name.vercel.app"
```

#### Optional Variables (for Meta/Facebook Lead Ads):
```bash
META_APP_SECRET="your-facebook-app-secret"
META_WEBHOOK_VERIFY_TOKEN="E2W_LMP_META_WEBHOOK_2025"
META_ACCESS_TOKEN="your-long-lived-page-access-token"
META_PAGE_ID="your-facebook-page-id"

# Cron Job Secret
CRON_SECRET="generate-random-string-for-cron-protection"
```

### 3. Add Environment Variables via CLI (Alternative)

```bash
# Add required variables
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production
vercel env add NEXT_PUBLIC_APP_URL production
```

### 4. Deploy to Vercel

```bash
# Deploy to production
vercel --prod

# Or let Vercel auto-deploy via Git
git push origin main
```

### 5. Run Database Migrations

After successful deployment, run migrations:

```bash
# Install Vercel CLI globally if not done
npm install -g vercel

# Run migrations on Vercel
vercel env pull .env.production
npx prisma migrate deploy
```

Or use Vercel's deployment hooks to run migrations automatically.

## Quick PlanetScale Setup (Recommended)

1. Sign up at https://planetscale.com/
2. Create a new database
3. Click "Connect" → "Prisma" → Copy the DATABASE_URL
4. Add to Vercel environment variables
5. Deploy!

PlanetScale advantages:
- Free tier with generous limits
- Serverless MySQL
- Built-in connection pooling
- No VPC/networking setup needed

## Troubleshooting

### Build Fails with Prisma Error
Make sure `DATABASE_URL` is set in Vercel environment variables.

### Runtime Database Connection Error
- Verify DATABASE_URL format: `mysql://user:password@host:3306/database`
- For PlanetScale, use the connection string they provide
- Ensure database is accessible from Vercel's IP range

### Environment Variables Not Working
- Make sure variables are set for "Production" environment
- Redeploy after adding new variables
- Check variable names match exactly (case-sensitive)

## Post-Deployment Steps

1. **Seed Initial Data** (if needed):
   ```bash
   npm run seed
   ```

2. **Create Admin User** via database or API

3. **Test Login** at your deployed URL

4. **Set up Meta Webhook** (if using Facebook Lead Ads):
   - Go to Facebook Developers
   - Set Webhook URL: `https://your-app.vercel.app/api/webhooks/meta-leads`
   - Use the `META_WEBHOOK_VERIFY_TOKEN` value

## Deployment URLs

- **Inspect**: https://vercel.com/baleen-medias-projects/e2-w-lmp
- **Production**: Will be shown after successful deployment

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Prisma on Vercel: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel
- PlanetScale Docs: https://planetscale.com/docs
