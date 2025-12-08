import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

/**
 * GET /api/dsr/call-logs
 * Fetch call logs for a specific date with optional agent filter
 * 
 * Query Parameters:
 * - date: ISO date string (required)
 * - agentId: Filter by caller/agent (optional)
 * - page: Page number for pagination (optional, default: 1)
 * - limit: Items per page (optional, default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');
    const agentId = searchParams.get('agentId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!dateParam) {
      return NextResponse.json(
        { success: false, error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Build date filter for the specific date
    const dateFilter: any = {};
    try {
      const startDate = new Date(dateParam);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateParam);
      endDate.setHours(23, 59, 59, 999);
      
      dateFilter.gte = startDate;
      dateFilter.lte = endDate;
    } catch (e) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Build where clause
    const whereClause: any = {
      createdAt: dateFilter,
    };
    
    if (agentId) {
      whereClause.callerId = agentId;
    }

    // Get total count for pagination
    const totalCount = await prisma.callLog.count({
      where: whereClause,
    });

    // Fetch call logs with pagination
    const callLogs = await prisma.callLog.findMany({
      where: whereClause,
      include: {
        Lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
          },
        },
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: {
        callLogs,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Call Logs API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch call logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
