import { NextRequest, NextResponse } from 'next/server';

// Test endpoint to verify webhook configuration and Meta API connectivity
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://e2wleadmanager.vercel.app'}/api/webhooks/meta-leads`,
    checks: {},
    recommendations: [],
  };

  // Check 1: Environment Variables
  const envVars = {
    META_ACCESS_TOKEN: !!process.env.META_ACCESS_TOKEN,
    META_APP_SECRET: !!process.env.META_APP_SECRET,
    META_PAGE_ID: !!process.env.META_PAGE_ID,
    META_WEBHOOK_VERIFY_TOKEN: !!process.env.META_WEBHOOK_VERIFY_TOKEN,
    NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
  };

  results.checks.environmentVariables = {
    status: Object.values(envVars).every(v => v) ? 'PASS' : 'FAIL',
    details: envVars,
  };

  if (!Object.values(envVars).every(v => v)) {
    results.recommendations.push('Missing required environment variables. Check Vercel environment settings.');
  }

  // Check 2: Access Token Validity
  try {
    const accessToken = process.env.META_ACCESS_TOKEN;
    const pageId = process.env.META_PAGE_ID;

    if (accessToken && pageId) {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}?fields=id,name&access_token=${accessToken}`,
        { method: 'GET' }
      );

      if (response.ok) {
        const data = await response.json();
        results.checks.metaApiConnection = {
          status: 'PASS',
          pageId: data.id,
          pageName: data.name,
        };

        // Try to get token debug info
        const debugResponse = await fetch(
          `https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`
        );

        if (debugResponse.ok) {
          const debugData = await debugResponse.json();
          const tokenData = debugData.data;
          
          results.checks.accessToken = {
            status: tokenData.is_valid ? 'PASS' : 'FAIL',
            expiresAt: tokenData.expires_at ? new Date(tokenData.expires_at * 1000).toISOString() : 'Never (long-lived)',
            scopes: tokenData.scopes,
            appId: tokenData.app_id,
          };

          if (!tokenData.is_valid) {
            results.recommendations.push('⚠️ Access token is INVALID. Generate a new long-lived token from Meta Business Suite.');
          } else if (tokenData.expires_at && tokenData.expires_at * 1000 < Date.now() + 7 * 24 * 60 * 60 * 1000) {
            results.recommendations.push('⚠️ Access token expires soon. Consider refreshing it.');
          }
        }
      } else {
        const errorText = await response.text();
        results.checks.metaApiConnection = {
          status: 'FAIL',
          error: `HTTP ${response.status}: ${errorText}`,
        };
        results.recommendations.push('❌ Cannot connect to Meta API. Token may be expired or invalid.');
      }
    } else {
      results.checks.metaApiConnection = {
        status: 'SKIP',
        reason: 'Missing ACCESS_TOKEN or PAGE_ID',
      };
    }
  } catch (error) {
    results.checks.metaApiConnection = {
      status: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Check 3: Recent Leads
  try {
    const { default: prisma } = await import('@/shared/lib/db/prisma');
    
    const recentLeads = await prisma.lead.findMany({
      where: { source: 'Meta' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        phone: true,
        createdAt: true,
        metadata: true,
      },
    });

    results.checks.databaseLeads = {
      status: 'PASS',
      totalMetaLeads: await prisma.lead.count({ where: { source: 'Meta' } }),
      mostRecentLeadAt: recentLeads[0]?.createdAt || null,
      recentLeads: recentLeads.map((lead: any) => ({
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        createdAt: lead.createdAt,
        receivedVia: (lead.metadata as any)?.webhookReceived ? 'webhook' : 
                     (lead.metadata as any)?.pollingFetched ? 'polling' : 'unknown',
      })),
    };

    const lastLead = recentLeads[0];
    if (lastLead) {
      const hoursSinceLastLead = (Date.now() - new Date(lastLead.createdAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastLead > 24) {
        results.recommendations.push(`⚠️ Last Meta lead was ${Math.round(hoursSinceLastLead)} hours ago. Check if webhook is receiving calls.`);
      }
    } else {
      results.recommendations.push('No Meta leads in database yet.');
    }
  } catch (error) {
    results.checks.databaseLeads = {
      status: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Check 4: Webhook Subscription Status
  try {
    const accessToken = process.env.META_ACCESS_TOKEN;
    const pageId = process.env.META_PAGE_ID;

    if (accessToken && pageId) {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/subscribed_apps?access_token=${accessToken}`,
        { method: 'GET' }
      );

      if (response.ok) {
        const data = await response.json();
        const subscriptions = data.data || [];
        
        results.checks.webhookSubscription = {
          status: subscriptions.length > 0 ? 'PASS' : 'FAIL',
          subscriptions: subscriptions.map((sub: any) => ({
            id: sub.id,
            name: sub.name || sub.id,
            subscribedFields: sub.subscribed_fields || [],
          })),
        };

        if (subscriptions.length === 0) {
          results.recommendations.push('❌ No webhook subscriptions found. Set up webhook in Meta App Dashboard.');
        } else {
          const hasLeadgen = subscriptions.some((sub: any) => 
            sub.subscribed_fields?.includes('leadgen')
          );
          if (!hasLeadgen) {
            results.recommendations.push('⚠️ leadgen field not subscribed. Add it in Meta App Dashboard webhook settings.');
          }
        }
      } else {
        results.checks.webhookSubscription = {
          status: 'FAIL',
          error: `HTTP ${response.status}`,
        };
      }
    }
  } catch (error) {
    results.checks.webhookSubscription = {
      status: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Summary
  const allChecks = Object.values(results.checks);
  const failedChecks = allChecks.filter((check: any) => check.status === 'FAIL' || check.status === 'ERROR');
  
  results.summary = {
    overall: failedChecks.length === 0 ? 'HEALTHY' : 'ISSUES_FOUND',
    totalChecks: allChecks.length,
    failed: failedChecks.length,
  };

  if (results.recommendations.length === 0) {
    results.recommendations.push('✅ All checks passed! Webhook should be working correctly.');
  }

  return NextResponse.json(results, { 
    status: failedChecks.length > 0 ? 500 : 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// POST endpoint to simulate a webhook call for testing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🧪 TEST WEBHOOK CALL RECEIVED');
    console.log('Body:', JSON.stringify(body, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Test webhook received successfully',
      receivedAt: new Date().toISOString(),
      body: body,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 400 });
  }
}
