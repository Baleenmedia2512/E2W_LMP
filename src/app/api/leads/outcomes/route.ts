import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/leads/outcomes
 * Optimized endpoint for fetching lead outcomes (unqualified, unreachable, won, lost)
 * Supports filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // unqualified, unreach, won, lost
    const search = searchParams.get('search');
    const assignedToId = searchParams.get('assignedToId');
    const source = searchParams.get('source');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Filter by outcome statuses only
    if (status) {
      where.status = status;
    } else {
      where.status = {
        in: ['unqualified', 'unreach', 'won', 'lost'],
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (assignedToId && assignedToId !== 'all') {
      where.assignedToId = assignedToId;
    }

    if (source && source !== 'all') {
      where.source = source;
    }

    if (startDate || endDate) {
      where.updatedAt = {};
      if (startDate) {
        where.updatedAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.updatedAt.lte = end;
      }
    }

    // Fetch leads with pagination
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          User_Lead_assignedToIdToUser: { select: { id: true, name: true, email: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    // Transform leads to match frontend expectations
    const transformedLeads = leads.map((lead: any) => ({
      ...lead,
      assignedTo: lead.User_Lead_assignedToIdToUser,
      User_Lead_assignedToIdToUser: undefined,
    }));

    // Group by status for quick access
    const grouped = {
      unqualified: transformedLeads.filter((l: any) => l.status === 'unqualified'),
      unreach: transformedLeads.filter((l: any) => l.status === 'unreach'),
      won: transformedLeads.filter((l: any) => l.status === 'won'),
      lost: transformedLeads.filter((l: any) => l.status === 'lost'),
    };

    return NextResponse.json({
      success: true,
      data: transformedLeads,
      grouped,
      total,
      page,
      pageSize: limit,
      hasMore: skip + limit < total,
    });
  } catch (error) {
    console.error('Error fetching lead outcomes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lead outcomes' },
      { status: 500 }
    );
  }
}
