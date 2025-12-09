import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

/**
 * GET /api/reports
 * Optimized endpoint for reports page with server-side calculations
 * 
 * Query Parameters:
 * - startDate: ISO date string (optional, defaults to 7 days ago)
 * - endDate: ISO date string (optional, defaults to today)
 * - dateFilterType: 'created' | 'updated' (optional, defaults to 'created')
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateFilterType = searchParams.get('dateFilterType') || 'created';
    
    // Default to last 7 days if no dates provided
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
    } catch (e) {
      startDate = defaultStartDate;
      endDate = defaultEndDate;
    }
    
    // Set time boundaries
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Build date filter based on type
    const dateFilter = dateFilterType === 'created' 
      ? { createdAt: { gte: startDate, lte: endDate } }
      : { updatedAt: { gte: startDate, lte: endDate } };

    // Fetch leads with optimized query
    const leads = await prisma.lead.findMany({
      where: dateFilter,
      select: {
        id: true,
        status: true,
        source: true,
        callAttempts: true,
        createdAt: true,
        updatedAt: true,
        User_Lead_assignedToIdToUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Fetch calls for the date range
    const calls = await prisma.callLog.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        duration: true,
      },
    });

    // Calculate metrics server-side
    const totalLeads = leads.length;
    const newLeads = leads.filter(l => l.status === 'new').length;
    const wonDeals = leads.filter(l => l.status === 'won').length;
    const lostDeals = leads.filter(l => l.status === 'lost').length;
    
    // Correct conversion rate: Won / Total leads
    const conversionRate = totalLeads > 0 ? Math.round((wonDeals / totalLeads) * 100) : 0;
    
    // Calculate average call duration
    const callsWithDuration = calls.filter(call => call.duration && call.duration > 0);
    const totalCallDuration = callsWithDuration.reduce((sum, call) => sum + (call.duration || 0), 0);
    const avgCallDuration = callsWithDuration.length > 0 
      ? Math.round(totalCallDuration / callsWithDuration.length) 
      : 0;

    // Calculate leads by source
    const leadsBySource: Record<string, number> = {};
    leads.forEach(lead => {
      leadsBySource[lead.source] = (leadsBySource[lead.source] || 0) + 1;
    });

    // Calculate leads by agent
    const agentMap: Record<string, number> = {};
    leads.forEach(lead => {
      const agentName = lead.User_Lead_assignedToIdToUser?.name || 'Unassigned';
      agentMap[agentName] = (agentMap[agentName] || 0) + 1;
    });
    
    const leadsByAgent = Object.entries(agentMap).map(([agent, count]) => ({
      agent,
      count,
      percentage: totalLeads > 0 ? Math.round((count / totalLeads) * 100 * 100) / 100 : 0,
    }));

    // Calculate leads by status
    const leadsByStatus: Record<string, number> = {};
    leads.forEach(lead => {
      leadsByStatus[lead.status] = (leadsByStatus[lead.status] || 0) + 1;
    });

    // Calculate call attempts distribution
    const leadsByAttempts: Record<string, number> = {
      '0': 0,
      '1-3': 0,
      '4-6': 0,
      '7+': 0,
    };
    
    leads.forEach(lead => {
      const attempts = lead.callAttempts || 0;
      if (attempts === 0) (leadsByAttempts['0'] as number)++;
      else if (attempts <= 3) (leadsByAttempts['1-3'] as number)++;
      else if (attempts <= 6) (leadsByAttempts['4-6'] as number)++;
      else (leadsByAttempts['7+'] as number)++;
    });

    // Calculate total call attempts
    const totalCallAttempts = leads.reduce((sum, lead) => sum + (lead.callAttempts || 0), 0);
    const avgCallAttempts = totalLeads > 0 ? Math.round((totalCallAttempts / totalLeads) * 10) / 10 : 0;

    const reportsData = {
      totalLeads,
      newLeads,
      wonDeals,
      lostDeals,
      conversionRate,
      avgCallAttempts,
      totalCallAttempts,
      avgCallDuration,
      totalCallDuration,
      leadsBySource,
      leadsByAgent,
      leadsByStatus,
      leadsByAttempts,
    };

    return NextResponse.json({
      success: true,
      data: reportsData,
      timestamp: new Date().toISOString(),
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        type: dateFilterType,
      },
    });

  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reports data' },
      { status: 500 }
    );
  }
}