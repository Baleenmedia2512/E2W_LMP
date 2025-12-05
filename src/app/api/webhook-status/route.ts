import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Quick webhook test - shows if webhook is properly configured
export async function GET(request: NextRequest) {
  const checks = {
    timestamp: new Date().toISOString(),
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/api/webhooks/meta-leads`,
    environment: {
      META_ACCESS_TOKEN: !!process.env.META_ACCESS_TOKEN,
      META_APP_SECRET: !!process.env.META_APP_SECRET,
      META_WEBHOOK_VERIFY_TOKEN: !!process.env.META_WEBHOOK_VERIFY_TOKEN,
      META_PAGE_ID: !!process.env.META_PAGE_ID,
    },
    status: 'Ready',
  };

  const allConfigured = Object.values(checks.environment).every(v => v);

  return NextResponse.json({
    ...checks,
    ready: allConfigured,
    message: allConfigured 
      ? '✅ Webhook is configured and ready'
      : '❌ Missing environment variables - check Vercel settings',
    nextSteps: allConfigured ? [
      '1. Subscribe webhook in Meta dashboard',
      '2. Test with real form submission',
      '3. Run backfill: GET /api/backfill-meta-leads',
    ] : [
      '1. Set all environment variables in Vercel',
      '2. Redeploy the app',
      '3. Come back to this page',
    ],
  }, { 
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
