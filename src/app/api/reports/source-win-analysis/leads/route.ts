import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { normalizeSourceForAnalytics } from '@/shared/lib/utils/source-normalizer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

type LeadMetric = 'total' | 'won' | 'lost';

/**
 * GET /api/reports/source-win-analysis/leads
 * Lead-level drill-down for Source Performance Table (lazy-loaded on expand).
 *
 * Query Parameters:
 * - source: normalized source channel name (required)
 * - metric: 'total' | 'won' | 'lost' (defaults to 'total')
 * - startDate, endDate, dateFilterType, agentId, leadCategory — same as parent endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get('source');
    const metric = (searchParams.get('metric') || 'total') as LeadMetric;
    const dateFilterType = searchParams.get('dateFilterType') || 'created';
    const agentId = searchParams.get('agentId') || null;
    const leadCategory = searchParams.get('leadCategory') || 'all';

    if (!source) {
      return NextResponse.json(
        { success: false, error: 'source parameter is required' },
        { status: 400 }
      );
    }

    if (metric !== 'total' && metric !== 'won' && metric !== 'lost') {
      return NextResponse.json(
        { success: false, error: 'metric must be total, won, or lost' },
        { status: 400 }
      );
    }

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

    if (metric === 'won') {
      whereClause.status = 'won';
    } else if (metric === 'lost') {
      whereClause.status = 'lost';
    }

    const now = new Date();

    const leads = await prisma.lead.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        status: true,
        source: true,
        campaign: true,
        createdAt: true,
        is_existing: true,
        notes: true,
        customerRequirement: true,
        User_Lead_assignedToIdToUser: {
          select: {
            id: true,
            name: true,
          },
        },
        CallLog: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { remarks: true },
        },
        FollowUp: {
          where: {
            status: 'pending',
            scheduledAt: { gte: now },
          },
          orderBy: { scheduledAt: 'asc' },
          take: 1,
          select: { scheduledAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const filteredLeads = leads
      .filter((lead) => normalizeSourceForAnalytics(lead.source) === source)
      .map((lead) => ({
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        status: lead.status,
        source: lead.source,
        campaign: lead.campaign,
        createdAt: lead.createdAt.toISOString(),
        is_existing: lead.is_existing,
        assignedTo: lead.User_Lead_assignedToIdToUser
          ? { id: lead.User_Lead_assignedToIdToUser.id, name: lead.User_Lead_assignedToIdToUser.name }
          : null,
        remarks:
          lead.CallLog[0]?.remarks?.trim() ||
          lead.customerRequirement?.trim() ||
          lead.notes?.trim() ||
          null,
        nextFollowupAt: lead.FollowUp[0]?.scheduledAt?.toISOString() ?? null,
      }));

    return NextResponse.json({
      success: true,
      data: {
        leads: filteredLeads,
        count: filteredLeads.length,
        source,
        metric,
      },
    });
  } catch (error) {
    console.error('Error fetching source win analysis leads:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch source leads' },
      { status: 500 }
    );
  }
}
