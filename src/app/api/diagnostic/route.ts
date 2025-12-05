import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Diagnostic endpoint to check Meta integration health
 */
export async function GET(request: NextRequest) {
  console.log('\n========================================');
  console.log('🔍 META INTEGRATION DIAGNOSTIC');
  console.log('========================================\n');

  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      environment: {},
      database: {},
      meta: {},
      issues: [],
      recommendations: [],
    };

    // 1. Check environment variables
    console.log('1️⃣ Checking environment variables...');
    results.environment = {
      META_ACCESS_TOKEN: !!process.env.META_ACCESS_TOKEN,
      META_APP_SECRET: !!process.env.META_APP_SECRET,
      META_WEBHOOK_VERIFY_TOKEN: !!process.env.META_WEBHOOK_VERIFY_TOKEN,
      META_PAGE_ID: !!process.env.META_PAGE_ID,
      DATABASE_URL: !!process.env.DATABASE_URL,
    };

    const missingEnv = Object.entries(results.environment)
      .filter(([_, value]) => !value)
      .map(([key, _]) => key);

    if (missingEnv.length > 0) {
      results.issues.push(`Missing environment variables: ${missingEnv.join(', ')}`);
    }

    // 2. Check database connection and Meta leads
    console.log('2️⃣ Checking database...');
    
    try {
      // Count leads by source (case-insensitive check)
      const totalLeads = await prisma.lead.count();
      const metaLeadsLower = await prisma.lead.count({ where: { source: 'meta' } });
      const metaLeadsCapital = await prisma.lead.count({ where: { source: 'Meta' } });
      const metaLeadsMixed = await prisma.lead.count({ 
        where: { 
          source: { 
            in: ['meta', 'Meta', 'META', 'mEta'] 
          } 
        } 
      });

      results.database = {
        connected: true,
        totalLeads,
        metaLeads: {
          lowercase: metaLeadsLower,
          capitalized: metaLeadsCapital,
          total: metaLeadsMixed,
        },
      };

      // Check for case sensitivity issues
      if (metaLeadsLower > 0 && metaLeadsCapital > 0) {
        results.issues.push(`CRITICAL: Mixed case in source field detected (${metaLeadsLower} lowercase, ${metaLeadsCapital} capitalized). This will cause duplicate detection failures!`);
        results.recommendations.push('Run SQL to normalize source field: UPDATE Lead SET source = LOWER(source) WHERE source LIKE "meta"');
      } else if (metaLeadsCapital > 0) {
        results.issues.push(`Source field uses "Meta" (capitalized). Should be normalized to lowercase "meta" for consistency.`);
        results.recommendations.push('Update existing leads: UPDATE Lead SET source = "meta" WHERE source = "Meta"');
      }

      // Check for recent Meta leads
      const recentMeta = await prisma.lead.findMany({
        where: {
          source: { in: ['meta', 'Meta'] },
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          phone: true,
          source: true,
          createdAt: true,
          metadata: true,
        },
      });

      results.database.recentMetaLeads = recentMeta.map(lead => ({
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        source: lead.source,
        createdAt: lead.createdAt,
        hasMetaLeadId: !!(lead.metadata && typeof lead.metadata === 'object' && 'metaLeadId' in lead.metadata),
      }));

      if (recentMeta.length === 0) {
        results.issues.push('No Meta leads created in the last 7 days. Webhook may not be working!');
        results.recommendations.push('Check webhook subscription in Meta Business Manager');
        results.recommendations.push('Test webhook endpoint: GET /api/webhook-status');
        results.recommendations.push('Run backfill: GET /api/backfill-meta-leads');
      }

      // Check for Gomathi user
      const gomathi = await prisma.user.findUnique({
        where: { email: 'gomathi@baleenmedia.com' },
        select: { id: true, name: true, isActive: true },
      });

      results.database.gomathiUser = gomathi ? {
        id: gomathi.id,
        name: gomathi.name,
        isActive: gomathi.isActive,
      } : null;

      if (!gomathi) {
        results.issues.push('Gomathi user (gomathi@baleenmedia.com) not found. Meta leads cannot be assigned!');
        results.recommendations.push('Create Gomathi user account in the system');
      } else if (!gomathi.isActive) {
        results.issues.push('Gomathi user exists but is inactive. Meta leads will be assigned to fallback agent.');
      }

    } catch (dbError) {
      results.database = {
        connected: false,
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
      };
      results.issues.push('Database connection failed!');
    }

    // 3. Test Meta API connection
    console.log('3️⃣ Testing Meta API connection...');
    
    if (results.environment.META_ACCESS_TOKEN && results.environment.META_PAGE_ID) {
      try {
        const response = await fetch(
          `https://graph.facebook.com/v21.0/${process.env.META_PAGE_ID}?fields=name,id&access_token=${process.env.META_ACCESS_TOKEN}`,
          { method: 'GET' }
        );

        if (response.ok) {
          const data = await response.json();
          results.meta = {
            connected: true,
            pageId: data.id,
            pageName: data.name,
          };
        } else {
          const errorText = await response.text();
          results.meta = {
            connected: false,
            error: errorText,
          };
          results.issues.push('Meta API connection failed. Check access token validity.');
          results.recommendations.push('Verify META_ACCESS_TOKEN in Meta Business Manager');
          results.recommendations.push('Check if token has expired or permissions are insufficient');
        }
      } catch (metaError) {
        results.meta = {
          connected: false,
          error: metaError instanceof Error ? metaError.message : 'Unknown error',
        };
        results.issues.push('Meta API request failed. Network or configuration issue.');
      }
    } else {
      results.meta = { connected: false, reason: 'Missing credentials' };
    }

    // 4. Overall health assessment
    results.overallHealth = results.issues.length === 0 ? 'HEALTHY' : 
                            results.issues.length <= 2 ? 'WARNING' : 'CRITICAL';

    console.log('\n========================================');
    console.log(`Overall Health: ${results.overallHealth}`);
    console.log(`Issues Found: ${results.issues.length}`);
    console.log('========================================\n');

    return NextResponse.json(results, { 
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Diagnostic error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Diagnostic failed',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
