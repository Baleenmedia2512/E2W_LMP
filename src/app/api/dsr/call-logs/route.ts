import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { extractTokenFromHeader, verifyToken } from '@/shared/lib/auth/auth-utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

/**
 * GET /api/dsr/call-logs
 * Fetch unique call logs (deduplicated by leadId) for a specific date or date range
 * Shows only the most recent call per lead to match Total Calls KPI
 * 
 * Query Parameters:
 * - date: ISO date string (optional, for backward compatibility)
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - agentId: Filter by caller/agent (optional)
 * - page: Page number for pagination (optional, default: 1)
 * - limit: Items per page (optional, default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check — must be logged in
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const agentId = searchParams.get('agentId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build date filter for the specific date or date range
    const dateFilter: any = {};
    try {
      // If startDate and endDate are provided, use them (date range mode)
      if (startDateParam || endDateParam) {
        if (startDateParam) {
          const startDate = new Date(startDateParam);
          startDate.setHours(0, 0, 0, 0);
          dateFilter.gte = startDate;
        }
        if (endDateParam) {
          const endDate = new Date(endDateParam);
          endDate.setHours(23, 59, 59, 999);
          dateFilter.lte = endDate;
        }
      } 
      // Otherwise, use date parameter for single day (backward compatible)
      else if (dateParam) {
        const startDate = new Date(dateParam);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateParam);
        endDate.setHours(23, 59, 59, 999);
        
        dateFilter.gte = startDate;
        dateFilter.lte = endDate;
      } else {
        return NextResponse.json(
          { success: false, error: 'Date parameter is required (date, startDate, or endDate)' },
          { status: 400 }
        );
      }
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

    // Fetch ALL call logs for the date (to deduplicate by leadId)
    const allCallLogs = await prisma.callLog.findMany({
      where: whereClause,
      include: {
        Lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            source: true,
            campaign: true,
            status: true,
            is_existing: true,
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
    });

    // Deduplicate by leadId - keep only the most recent call per lead
    const uniqueLeadCalls = new Map<string, any>();
    allCallLogs.forEach(call => {
      if (!uniqueLeadCalls.has(call.leadId)) {
        uniqueLeadCalls.set(call.leadId, call);
      }
    });

    // Convert to array and apply pagination
    const uniqueCallsArray = Array.from(uniqueLeadCalls.values());
    const totalCount = uniqueCallsArray.length;
    const callLogs = uniqueCallsArray.slice((page - 1) * limit, page * limit);

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
