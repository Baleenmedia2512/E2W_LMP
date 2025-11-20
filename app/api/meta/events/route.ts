import { NextRequest } from 'next/server';
import { withRole, createApiResponse, createApiError } from '@/lib/api-middleware';
import prisma from '@/lib/prisma';
import { retryFailedMetaLeads } from '@/lib/meta-processor';

/**
 * Meta Webhook Events API
 * View and manage received webhook events
 */

// ============================================
// GET - Fetch Webhook Events
// ============================================
export async function GET(request: NextRequest) {
  return withRole(['SuperAgent'], async (session) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const page = parseInt(searchParams.get('page') || '1');
      const pageSize = parseInt(searchParams.get('pageSize') || '20');
      const processedFilter = searchParams.get('processed');

      const where: any = {};

      if (processedFilter !== null) {
        where.processed = processedFilter === 'true';
      }

      const [events, total] = await Promise.all([
        prisma.metaWebhookEvent.findMany({
          where,
          include: {
            lead: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                status: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.metaWebhookEvent.count({ where }),
      ]);

      return createApiResponse({
        data: events,
        total,
        page,
        pageSize,
        hasMore: total > page * pageSize,
      });
    } catch (error) {
      console.error('Get Meta events error:', error);
      return createApiError('Failed to fetch Meta events', 500);
    }
  });
}

// ============================================
// POST - Retry Failed Events
// ============================================
export async function POST(request: NextRequest) {
  return withRole(['SuperAgent'], async (session) => {
    try {
      // Trigger retry of failed events
      await retryFailedMetaLeads();

      return createApiResponse(
        { success: true },
        'Retry process started'
      );
    } catch (error) {
      console.error('Retry Meta events error:', error);
      return createApiError('Failed to retry events', 500);
    }
  });
}
