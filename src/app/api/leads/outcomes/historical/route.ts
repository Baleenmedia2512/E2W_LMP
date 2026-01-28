import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/leads/outcomes/historical
 * Fetches leads that were historically marked as Won based on ActivityHistory
 * Shows leads even if they were later rescheduled to follow-up
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const assignedToId = searchParams.get('assignedToId');
    const source = searchParams.get('source');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Find all activity history entries where status was changed to 'won'
    const wonActivitiesWhere: any = {
      action: 'status_changed',
      newValue: 'won',
    };

    // Apply date filter to activity createdAt
    if (startDate || endDate) {
      wonActivitiesWhere.createdAt = {};
      if (startDate) {
        wonActivitiesWhere.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        wonActivitiesWhere.createdAt.lte = end;
      }
    }

    const wonActivities = await prisma.activityHistory.findMany({
      where: wonActivitiesWhere,
      include: {
        Lead: {
          include: {
            User_Lead_assignedToIdToUser: { 
              select: { id: true, name: true, email: true } 
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group leads by ID and count how many times each was marked as won
    const leadMap = new Map();
    
    for (const activity of wonActivities) {
      const lead = activity.Lead;
      if (!lead) continue;
      
      // Apply additional filters
      if (search) {
        const searchLower = search.toLowerCase();
        const nameMatch = lead.name?.toLowerCase().includes(searchLower);
        const phoneMatch = lead.phone?.toLowerCase().includes(searchLower);
        if (!nameMatch && !phoneMatch) continue;
      }

      if (assignedToId && assignedToId !== 'all') {
        if (lead.assignedToId !== assignedToId) continue;
      }

      if (source && source !== 'all') {
        if (lead.source !== source) continue;
      }

      // Add or update lead with count
      if (leadMap.has(lead.id)) {
        const existingLead = leadMap.get(lead.id);
        existingLead.wonCount += 1;
        // Keep track of all won dates
        existingLead.wonDates.push(activity.createdAt);
      } else {
        leadMap.set(lead.id, {
          ...lead,
          assignedTo: lead.User_Lead_assignedToIdToUser,
          User_Lead_assignedToIdToUser: undefined,
          wonDate: activity.createdAt, // Most recent won date
          wonDates: [activity.createdAt], // Array of all won dates
          wonCount: 1, // Count of how many times it was marked as won
          currentStatus: lead.status, // Current status (might be different)
        });
      }
    }

    const transformedLeads = Array.from(leadMap.values());

    return NextResponse.json({
      success: true,
      data: transformedLeads,
      total: transformedLeads.length,
      isHistorical: true,
    });
  } catch (error) {
    console.error('Error fetching historical won leads:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch historical won leads' },
      { status: 500 }
    );
  }
}
