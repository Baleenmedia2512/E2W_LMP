import { NextRequest, NextResponse } from 'next/server';
import { validateAccessToken } from '@/shared/lib/meta/api';

export const dynamic = 'force-dynamic';

/**
 * Diagnostic endpoint for Meta integration
 * GET /api/diagnostic
 */
export async function GET(request: NextRequest) {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {
      META_ACCESS_TOKEN: !!process.env.META_ACCESS_TOKEN,
      META_APP_SECRET: !!process.env.META_APP_SECRET,
      META_WEBHOOK_VERIFY_TOKEN: !!process.env.META_WEBHOOK_VERIFY_TOKEN,
      META_APP_ID: !!process.env.META_APP_ID,
      META_PAGE_ID: !!process.env.META_PAGE_ID,
    },
    token: {
      configured: false,
      valid: false,
      expiresAt: null as string | null,
      scopes: [] as string[],
      error: null as string | null,
    },
    requiredScopes: [
      'leads_retrieval',
      'pages_read_engagement',
      'pages_manage_metadata',
      'pages_show_list',
      'ads_management',
      'ads_read',
    ],
    recommendations: [] as string[],
  };

  // Check token validity
  if (process.env.META_ACCESS_TOKEN) {
    diagnostics.token.configured = true;
    
    try {
      const tokenInfo = await validateAccessToken();
      
      diagnostics.token.valid = tokenInfo.isValid;
      diagnostics.token.expiresAt = tokenInfo.expiresAt?.toISOString() || null;
      diagnostics.token.scopes = tokenInfo.scopes || [];
      diagnostics.token.error = tokenInfo.error || null;

      // Check if token is expiring soon (within 7 days)
      if (tokenInfo.expiresAt) {
        const daysUntilExpiry = Math.floor(
          (tokenInfo.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysUntilExpiry < 7) {
          diagnostics.recommendations.push(
            `⚠️ Token expires in ${daysUntilExpiry} days. Consider refreshing it.`
          );
        }
      }

      // Check for missing scopes
      const missingScopes = diagnostics.requiredScopes.filter(
        scope => !diagnostics.token.scopes.includes(scope)
      );

      if (missingScopes.length > 0) {
        diagnostics.recommendations.push(
          `⚠️ Missing required scopes: ${missingScopes.join(', ')}`
        );
      }
    } catch (error: any) {
      diagnostics.token.error = error.message;
      diagnostics.recommendations.push(
        `❌ Failed to validate token: ${error.message}`
      );
    }
  } else {
    diagnostics.recommendations.push(
      '❌ META_ACCESS_TOKEN not configured in environment variables'
    );
  }

  // Check other required environment variables
  if (!process.env.META_APP_SECRET) {
    diagnostics.recommendations.push(
      '❌ META_APP_SECRET not configured'
    );
  }

  if (!process.env.META_WEBHOOK_VERIFY_TOKEN) {
    diagnostics.recommendations.push(
      '❌ META_WEBHOOK_VERIFY_TOKEN not configured'
    );
  }

  // Overall status
  const status = diagnostics.recommendations.filter((r: any) => r.startsWith('❌')).length === 0
    ? 'healthy'
    : diagnostics.recommendations.filter((r: any) => r.startsWith('⚠️')).length > 0
    ? 'warning'
    : 'error';

  return NextResponse.json({
    status,
    ...diagnostics,
  }, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
