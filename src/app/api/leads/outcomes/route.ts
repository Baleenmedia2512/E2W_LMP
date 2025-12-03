import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';

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
          assignedTo: { select: { id: true, name: true, email: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    // Group by status for quick access
    const grouped = {
      unqualified: leads.filter(l => l.status === 'unqualified'),
      unreach: leads.filter(l => l.status === 'unreach'),
      won: leads.filter(l => l.status === 'won'),
      lost: leads.filter(l => l.status === 'lost'),
    };

    return NextResponse.json({
      success: true,
      data: leads,
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
