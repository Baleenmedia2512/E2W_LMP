import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/leads/schedule
 * Optimized endpoint for fetching unqualified leads with follow-ups
 * Supports filtering and sorting by follow-up date
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const assignedToId = searchParams.get('assignedToId');
    const source = searchParams.get('source');
    const dateRange = searchParams.get('dateRange');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = (page - 1) * limit;

    // Build where clause for leads
    const leadWhere: any = {
      status: 'unqualified',
    };

    if (search) {
      leadWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (assignedToId && assignedToId !== 'all') {
      leadWhere.assignedToId = assignedToId;
    }

    if (source && source !== 'all') {
      leadWhere.source = source;
    }

    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      leadWhere.createdAt = {};
      
      if (dateRange === 'today') {
        leadWhere.createdAt.gte = today;
      } else if (dateRange === '7days') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        leadWhere.createdAt.gte = weekAgo;
      } else if (dateRange === '30days') {
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        leadWhere.createdAt.gte = monthAgo;
      }
    }

    // Fetch unqualified leads with their follow-ups
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: leadWhere,
        include: {
          User_Lead_assignedToIdToUser: { select: { id: true, name: true, email: true } },
          FollowUp: {
            orderBy: {
              scheduledAt: 'asc',
            },
            take: 1, // Only get the next follow-up
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where: leadWhere }),
    ]);

    // Process leads and sort by follow-up date, transform field names
    const leadsWithFollowUps = leads.map((lead: any) => ({
      ...lead,
      assignedTo: lead.User_Lead_assignedToIdToUser,
      User_Lead_assignedToIdToUser: undefined,
      nextFollowUp: lead.FollowUp[0] || null,
    }));

    // Sort by nearest follow-up date (overdue first, then by date)
    const now = new Date();
    leadsWithFollowUps.sort((a: any, b: any) => {
      if (!a.nextFollowUp && !b.nextFollowUp) return 0;
      if (!a.nextFollowUp) return 1;
      if (!b.nextFollowUp) return -1;

      const aDate = new Date(a.nextFollowUp.scheduledAt);
      const bDate = new Date(b.nextFollowUp.scheduledAt);
      const aOverdue = aDate < now;
      const bOverdue = bDate < now;

      // Overdue items come first
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Sort by date
      return aDate.getTime() - bDate.getTime();
    });

    return NextResponse.json({
      success: true,
      data: leadsWithFollowUps,
      total,
      page,
      pageSize: limit,
      hasMore: skip + limit < total,
    });
  } catch (error) {
    console.error('Error fetching schedule leads:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schedule leads' },
      { status: 500 }
    );
  }
}
