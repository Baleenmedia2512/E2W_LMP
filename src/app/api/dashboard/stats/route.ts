import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/dashboard/stats
 * Fetch comprehensive dashboard statistics with date range filtering
 * 
 * Query Parameters:
 * - startDate: ISO date string (required for filtering)
 * - endDate: ISO date string (required for filtering)
 * - userId: Filter by assigned user (optional)
 * 
 * When date range is provided (e.g., Today):
 * - New Arrival: Leads CREATED in date range
 * - Follow-up Today: Follow-ups SCHEDULED in date range
 * - Overdue Follow-up: Follow-ups that BECAME overdue in date range
 * - Total: All leads CREATED or UPDATED in date range
 * - Won: Leads marked as WON (updatedAt) in date range
 * - Conversations: Calls made in date range
 * - Win Rate: Won / (Won + Lost) in date range
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const userId = searchParams.get('userId');

    // Build date filter for the selected range
    const dateFilter: any = {};
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
      
      dateFilter.gte = startDate;
      dateFilter.lte = endDate;
    }

    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Build user filter
    const userFilter = userId ? { assignedToId: userId } : {};

    // 1. NEW ARRIVAL - Leads with status "new" created in date range
    const newLeadsWhere: any = { status: 'new', ...userFilter };
    if (hasDateFilter) {
      newLeadsWhere.createdAt = dateFilter;
    }

    // 2. FOLLOW-UPS SCHEDULED in date range - count unique leads
    // CRITICAL: Only count follow-ups for leads with ACTIVE statuses to match lead categorization
    // NOTE: For "Follow-ups Today" count, we need ALL follow-ups to find the NEXT one per lead
    const followUpsScheduledWhere: any = {
      Lead: {
        status: {
          in: ['new', 'followup', 'qualified']
        },
        ...(userId && { assignedToId: userId }),
      },
    };
    // DON'T apply date filter here - we need all follow-ups to determine which is NEXT
    // The counting logic below will filter by today's date

    // 3. WON LEADS - marked as won (by updatedAt) in date range
    const wonLeadsWhere: any = { status: 'won', ...userFilter };
    if (hasDateFilter) {
      wonLeadsWhere.updatedAt = dateFilter;
    }

    // 4. LOST LEADS - marked as lost (by updatedAt) in date range
    const lostLeadsWhere: any = { status: 'lost', ...userFilter };
    if (hasDateFilter) {
      lostLeadsWhere.updatedAt = dateFilter;
    }

    // 5. TOTAL LEADS - updated (last edited) in date range
    const totalLeadsWhere: any = { ...userFilter };
    if (hasDateFilter) {
      totalLeadsWhere.updatedAt = dateFilter;
    }

    // 6. CALLS/CONVERSATIONS - made in date range
    const callsWhere: any = {};
    if (hasDateFilter) {
      callsWhere.createdAt = dateFilter;
    }
    if (userId) {
      callsWhere.callerId = userId;
    }

    const now = new Date();

    // Fetch all stats in parallel for optimal performance
    const [
      newLeadsCount,
      wonLeadsCount,
      lostLeadsCount,
      totalLeadsCount,
      conversationsCount,
      followUpsScheduled,
      allPendingFollowUps,
      recentLeads,
      upcomingFollowUps,
    ] = await Promise.all([
      // 1. New leads created in date range
      prisma.lead.count({ where: newLeadsWhere }),

      // 2. Won leads in date range
      prisma.lead.count({ where: wonLeadsWhere }),

      // 3. Lost leads in date range
      prisma.lead.count({ where: lostLeadsWhere }),

      // 4. Total leads (created or updated in date range)
      prisma.lead.count({ where: totalLeadsWhere }),

      // 5. Conversations/Calls in date range
      prisma.callLog.count({ where: callsWhere }),

      // 6. Follow-ups scheduled in date range - get all to count unique leads
      prisma.followUp.findMany({ 
        where: followUpsScheduledWhere,
        select: { leadId: true, scheduledAt: true }
      }),

      // 7. All pending follow-ups (for overdue calculation) - CRITICAL: only for ACTIVE leads
      // This matches the lead categorization logic which filters by active statuses
      prisma.followUp.findMany({
        where: {
          Lead: {
            status: {
              in: ['new', 'followup', 'qualified']
            },
            ...(userId && { assignedToId: userId }),
          },
        },
        orderBy: { scheduledAt: 'desc' },
      }),

      // 8. Recent leads (from date range)
      prisma.lead.findMany({
        where: newLeadsWhere,
        include: {
          User_Lead_assignedToIdToUser: { select: { id: true, name: true, email: true } },
          User_Lead_createdByIdToUser: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // 9. Upcoming follow-ups for display - CRITICAL: only for ACTIVE leads
      prisma.followUp.findMany({
        where: {
          Lead: {
            status: {
              in: ['new', 'followup', 'qualified']
            },
            ...(userId && { assignedToId: userId }),
          },
        },
        include: {
          Lead: { select: { id: true, name: true, phone: true, status: true } },
          User: { select: { id: true, name: true, email: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      }),
    ]);

    // Calculate unique leads with NEXT follow-up scheduled for TODAY
    // CRITICAL: This MUST match the logic in lead-categorization.ts exactly
    // Prefer FUTURE follow-ups over past ones when determining the "next" follow-up
    const leadFollowUpMap = new Map<string, any>();
    
    // Define today's date range
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    // Group all follow-ups by lead
    const followUpsByLeadForToday = new Map<string, any[]>();
    for (const followUp of followUpsScheduled) {
      if (!followUpsByLeadForToday.has(followUp.leadId)) {
        followUpsByLeadForToday.set(followUp.leadId, []);
      }
      followUpsByLeadForToday.get(followUp.leadId)!.push(followUp);
    }
    
    // Find the NEXT follow-up per lead (prefer earliest future, else most recent past)
    for (const [leadId, followUps] of followUpsByLeadForToday.entries()) {
      const futureFollowUps = followUps.filter(f => new Date(f.scheduledAt) >= now);
      const pastFollowUps = followUps.filter(f => new Date(f.scheduledAt) < now);
      
      let nextFollowUp;
      
      if (futureFollowUps.length > 0) {
        // Prefer earliest future follow-up
        nextFollowUp = futureFollowUps.reduce((earliest, current) => {
          return new Date(current.scheduledAt) < new Date(earliest.scheduledAt) ? current : earliest;
        });
      } else if (pastFollowUps.length > 0) {
        // If no future, use most recent past
        nextFollowUp = pastFollowUps.reduce((latest, current) => {
          return new Date(current.scheduledAt) > new Date(latest.scheduledAt) ? current : latest;
        });
      }
      
      if (nextFollowUp) {
        leadFollowUpMap.set(leadId, nextFollowUp);
      }
    }
    
    // Count only leads whose NEXT follow-up is scheduled for TODAY with FUTURE time
    let followUpsDueCount = 0;
    for (const followUp of leadFollowUpMap.values()) {
      const scheduledDate = new Date(followUp.scheduledAt);
      // Count only TODAY's follow-ups that are in the FUTURE (time not passed yet)
      if (scheduledDate >= now && scheduledDate >= todayStart && scheduledDate <= todayEnd) {
        followUpsDueCount++;
      }
    }

    // Calculate OVERDUE LEADS (count unique leads with overdue follow-ups)
    // CRITICAL: Must match lead-categorization.ts logic exactly
    // Prefer FUTURE follow-ups over past ones when determining NEXT follow-up
    let overdueCount = 0;
    
    // Step 1: Group by leadId and find the NEXT follow-up (prefer future over past)
    const leadNextFollowUpMap = new Map<string, any>();
    
    // First, group all follow-ups by leadId
    const followUpsByLead = new Map<string, any[]>();
    for (const followUp of allPendingFollowUps) {
      if (!followUpsByLead.has(followUp.leadId)) {
        followUpsByLead.set(followUp.leadId, []);
      }
      followUpsByLead.get(followUp.leadId)!.push(followUp);
    }
    
    // Then, find NEXT follow-up per lead (prefer earliest future, else most recent past)
    for (const [leadId, followUps] of followUpsByLead.entries()) {
      const futureFollowUps = followUps.filter(f => new Date(f.scheduledAt) >= now);
      const pastFollowUps = followUps.filter(f => new Date(f.scheduledAt) < now);
      
      let nextFollowUp;
      
      if (futureFollowUps.length > 0) {
        // Prefer earliest future follow-up
        nextFollowUp = futureFollowUps.reduce((earliest, current) => {
          return new Date(current.scheduledAt) < new Date(earliest.scheduledAt) ? current : earliest;
        });
      } else if (pastFollowUps.length > 0) {
        // If no future, use most recent past
        nextFollowUp = pastFollowUps.reduce((latest, current) => {
          return new Date(current.scheduledAt) > new Date(latest.scheduledAt) ? current : latest;
        });
      }
      
      if (nextFollowUp) {
        leadNextFollowUpMap.set(leadId, nextFollowUp);
      }
    }
    
    // Step 2: Count leads whose NEXT follow-up is currently overdue (< now)
    const overdueLeadsSet = new Set<string>();
    for (const followUp of leadNextFollowUpMap.values()) {
      const scheduledDate = new Date(followUp.scheduledAt);
      if (scheduledDate < now) {
        overdueLeadsSet.add(followUp.leadId);
      }
    }
    overdueCount = overdueLeadsSet.size;

    // Prepare upcoming follow-ups for display
    // CRITICAL: Find the NEXT follow-up per lead (prefer future over past)
    const leadNextFollowUpForDisplay = new Map<string, any>();
    
    // Group all follow-ups by leadId
    const followUpsByLeadForDisplay = new Map<string, any[]>();
    for (const followUp of upcomingFollowUps) {
      if (!followUpsByLeadForDisplay.has(followUp.leadId)) {
        followUpsByLeadForDisplay.set(followUp.leadId, []);
      }
      followUpsByLeadForDisplay.get(followUp.leadId)!.push(followUp);
    }
    
    // Find the NEXT follow-up per lead (prefer earliest future, else most recent past)
    for (const [leadId, followUps] of followUpsByLeadForDisplay.entries()) {
      const futureFollowUps = followUps.filter(f => new Date(f.scheduledAt) >= now);
      const pastFollowUps = followUps.filter(f => new Date(f.scheduledAt) < now);
      
      let nextFollowUp;
      
      if (futureFollowUps.length > 0) {
        // Prefer earliest future follow-up
        nextFollowUp = futureFollowUps.reduce((earliest, current) => {
          return new Date(current.scheduledAt) < new Date(earliest.scheduledAt) ? current : earliest;
        });
      } else if (pastFollowUps.length > 0) {
        // If no future, use most recent past
        nextFollowUp = pastFollowUps.reduce((latest, current) => {
          return new Date(current.scheduledAt) > new Date(latest.scheduledAt) ? current : latest;
        });
      }
      
      if (nextFollowUp) {
        leadNextFollowUpForDisplay.set(leadId, nextFollowUp);
      }
    }
    
    // Filter only FUTURE follow-ups for display
    const upcomingArray: any[] = [];
    for (const followUp of leadNextFollowUpForDisplay.values()) {
      const scheduledDate = new Date(followUp.scheduledAt);
      if (scheduledDate >= now) {
        upcomingArray.push(followUp);
      }
    }
    
    // Sort by scheduled date and take top 5
    upcomingArray.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    const displayFollowUps = upcomingArray.slice(0, 5);

    // Calculate win rate (won / (won + lost)) for date range
    const totalClosed = wonLeadsCount + lostLeadsCount;
    const winRate = totalClosed > 0 
      ? Math.round((wonLeadsCount / totalClosed) * 100) 
      : 0;

    // Calculate conversion rate (won / total) for date range
    const conversionRate = totalLeadsCount > 0 
      ? Math.round((wonLeadsCount / totalLeadsCount) * 100) 
      : 0;

    // Calculate Total Leads for dashboard (New + Overdue + Today Follow-ups + Won)
    const totalLeadsForDashboard = newLeadsCount + overdueCount + followUpsDueCount + wonLeadsCount;

    // Transform recentLeads to match frontend expectations
    const transformedRecentLeads = recentLeads.map(lead => ({
      ...lead,
      assignedTo: lead.User_Lead_assignedToIdToUser,
      createdBy: lead.User_Lead_createdByIdToUser,
      User_Lead_assignedToIdToUser: undefined,
      User_Lead_createdByIdToUser: undefined,
    }));

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          newLeads: newLeadsCount,
          followUpsDue: followUpsDueCount,
          overdue: overdueCount,
          totalLeads: totalLeadsCount,
          totalLeadsForDashboard, // New + Overdue + Today Follow-ups
          wonLeads: wonLeadsCount,
          lostLeads: lostLeadsCount,
          conversations: conversationsCount,
          conversionRate,
          winRate,
        },
        recentLeads: transformedRecentLeads,
        upcomingFollowUps: displayFollowUps,
        timestamp: new Date().toISOString(),
        dateRange: hasDateFilter ? {
          start: startDateParam,
          end: endDateParam,
        } : null,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
