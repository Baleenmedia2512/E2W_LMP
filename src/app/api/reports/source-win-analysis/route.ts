import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { calculateSourceWinAnalysis } from '@/shared/lib/utils/source-win-analysis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

/**
 * GET /api/reports/source-win-analysis
 * Per-source win ratio deep analysis (additive endpoint — does not replace /api/reports).
 *
 * Query Parameters:
 * - startDate, endDate: ISO date strings (defaults: last 7 days)
 * - dateFilterType: 'created' | 'updated' (defaults to 'created')
 * - agentId: optional assigned agent filter
 * - leadCategory: 'all' | 'INBOUND' | 'OUTBOUND' (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateFilterType = searchParams.get('dateFilterType') || 'created';
    const agentId = searchParams.get('agentId') || null;
    const leadCategory = searchParams.get('leadCategory') || 'all';

    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 7);

    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let startDate: Date;
    let endDate: Date;

    try {
      startDate = startDateParam ? new Date(startDateParam) : defaultStartDate;
      endDate = endDateParam ? new Date(endDateParam) : defaultEndDate;
    } catch {
      startDate = defaultStartDate;
      endDate = defaultEndDate;
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const dateFilter =
      dateFilterType === 'created'
        ? { createdAt: { gte: startDate, lte: endDate } }
        : { updatedAt: { gte: startDate, lte: endDate } };

    const whereClause: Record<string, unknown> = { ...dateFilter };

    if (agentId) {
      whereClause.assignedToId = agentId;
    }

    if (leadCategory === 'INBOUND' || leadCategory === 'OUTBOUND') {
      whereClause.lead_category = leadCategory;
    }

    const leads = await prisma.lead.findMany({
      where: whereClause,
      select: {
        source: true,
        status: true,
        callAttempts: true,
        lead_category: true,
        assignedToId: true,
        User_Lead_assignedToIdToUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const analysis = calculateSourceWinAnalysis(
      leads.map((lead) => ({
        source: lead.source,
        status: lead.status,
        callAttempts: lead.callAttempts,
        lead_category: lead.lead_category,
        assignedToId: lead.assignedToId,
        agentName: lead.User_Lead_assignedToIdToUser?.name ?? null,
      }))
    );

    return NextResponse.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString(),
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        type: dateFilterType,
      },
      filters: {
        agentId: agentId || 'all',
        leadCategory,
      },
    });
  } catch (error) {
    console.error('Error fetching source win analysis:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch source win analysis' },
      { status: 500 }
    );
  }
}
