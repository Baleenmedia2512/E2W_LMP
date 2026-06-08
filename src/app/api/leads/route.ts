import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { notifyLeadAssigned } from '@/shared/lib/utils/notification-service';
import { normalizePhoneForStorage, isValidPhone, getPhoneValidationError } from '@/shared/utils/phone';
import { randomUUID } from 'crypto';
import { extractTokenFromHeader, verifyToken } from '@/shared/lib/auth/auth-utils';

// Sources that are always INBOUND (customer reached out to you)
const INBOUND_SOURCES = ['meta', 'website', 'whatsapp', 'online', 'referral', 'direct', 'consultant', 'indiamart', 'sulekha', 'just dial'];

function deriveLeadCategory(source: string, explicitCategory?: string): string {
  if (explicitCategory === 'INBOUND' || explicitCategory === 'OUTBOUND') {
    return explicitCategory;
  }
  return INBOUND_SOURCES.includes(source?.toLowerCase()) ? 'INBOUND' : 'OUTBOUND';
}

// GET all leads with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const assignedTo = searchParams.get('assigned_to');
    const assignedToId = searchParams.get('assignedToId');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const mode = searchParams.get('mode'); // 'dashboard' = smart fetch for default view
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Extract user from JWT token for authentication and filtering
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    let currentUserId: string | null = null;
    let currentUserRole: string | null = null;
    
    if (token) {
      const payload = verifyToken(token);
      if (payload && payload.userId) {
        currentUserId = payload.userId;
        currentUserRole = payload.roleName;
      }
    }

    const where: any = {};

    if (status) where.status = status;
    if (source) where.source = source;
    
    // Date range filter for createdAt
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lt = new Date(endDate);
      }
    }
    
    // Handle assigned_to filtering
    if (assignedTo === 'me') {
      // Explicit filter: show only leads assigned to current user
      if (currentUserId) {
        where.assignedToId = currentUserId;
      }
    } else if (assignedToId) {
      // Explicit assignedToId parameter
      where.assignedToId = assignedToId;
    } else if (currentUserId) {
      // DEFAULT BEHAVIOR: All roles can see all leads by default (unless "Assigned to Me" is checked)
      const canSeeAllLeads = true;
      
      if (!canSeeAllLeads) {
        // Normal agents (Sales Agent) ALWAYS see only their assigned leads
        where.assignedToId = currentUserId;
      }
      // Team Lead and Super Agent: no filter applied, they see all leads
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // ─── DASHBOARD MODE ────────────────────────────────────────────────────────
    // When mode=dashboard (the default leads page view), only fetch leads that
    // are actually visible on the dashboard instead of all 2000+ records.
    //
    // The dashboard shows exactly two groups of leads:
    //   1. "New Leads" section  → leads with status='new' (never had a follow-up)
    //   2. "Overdue/Scheduled"  → leads that have at least one active follow-up
    //
    // Everything else (qualified with no follow-up, old leads with no action) is
    // NOT shown on the default dashboard, so there's no reason to fetch them.
    // This cuts the query from 2000+ rows down to ~100–400 rows.
    if (mode === 'dashboard') {
      const outcomeStatuses = ['won', 'lost', 'unqualified', 'unreach', 'unreachable'];

      // Exclude leads that are in terminal/outcome statuses
      where.status = { notIn: outcomeStatuses };

      // Only fetch leads the dashboard will actually display:
      // new-status leads (New Leads section) OR leads with pending follow-ups (Overdue + Scheduled)
      where.AND = [
        {
          OR: [
            { status: 'new' },
            {
              FollowUp: {
                some: { status: { notIn: ['completed', 'cancelled'] } },
              },
            },
          ],
        },
      ];
    }
    // ──────────────────────────────────────────────────────────────────────────

    // CRITICAL FIX: In dashboard mode, we must fetch enough leads to include ALL with overdue follow-ups
    // Previous bug: Ordered by createdAt desc with limit 500, so older leads with overdue follow-ups
    // were excluded if user had >500 total leads. This caused dashboard to show 13 overdue but
    // leads page to show 0 (they were beyond the 500 limit).
    // Solution: In dashboard mode, fetch MORE leads and prioritize by updatedAt (recent activity)
    const effectiveLimit = mode === 'dashboard' ? 1000 : limit; // Double the dashboard fetch limit
    
    const leads = await prisma.lead.findMany({
      where,
      include: {
        User_Lead_assignedToIdToUser: { select: { id: true, name: true, email: true } },
        User_Lead_createdByIdToUser: { select: { id: true, name: true, email: true } },
        CallLog: { 
          orderBy: { createdAt: 'desc' }, 
          take: 3,
          select: {
            id: true,
            remarks: true,
            callStatus: true,
            createdAt: true,
            startedAt: true,
            endedAt: true,
            duration: true,
            attemptNumber: true,
          }
        },
      },
      // In dashboard mode: sort by updatedAt to show leads with recent activity (including follow-ups)
      // This ensures overdue leads (which get updated when follow-ups are created) appear in the result set
      // In normal mode: show newest leads first
      orderBy: mode === 'dashboard' 
        ? { updatedAt: 'desc' }  // Recent activity = higher priority
        : { createdAt: 'desc' }, // Chronological for full list
      skip,
      take: effectiveLimit,
    });

    // Transform the response to match frontend expectations
    const transformedLeads = leads.map((lead: any) => ({
      ...lead,
      assignedTo: lead.User_Lead_assignedToIdToUser,
      createdBy: lead.User_Lead_createdByIdToUser,
      User_Lead_assignedToIdToUser: undefined,
      User_Lead_createdByIdToUser: undefined,
    }));

    return NextResponse.json({
      success: true,
      data: transformedLeads,
      total: leads.length,
      page,
      pageSize: limit,
      hasMore: leads.length === limit,
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}

// Helper function for workload-based assignment
// Assigns to agent with LEAST pending workload (all "new" leads + follow-ups due today + overdue follow-ups)
async function getNextAgentForRoundRobin(): Promise<string | null> {
  console.log('🔵 getNextAgentForRoundRobin called');
  try {
    // Define today's date range (midnight to midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('📅 Date range:', { today: today.toISOString(), tomorrow: tomorrow.toISOString() });

    // Get all active Sales Agents with their workload
    const agents = await prisma.user.findMany({
      where: {
        isActive: true,
        Role: {
          name: {
            in: ['Sales Agent'],
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    console.log('👥 Found agents:', agents.length, agents.map(a => a.name));

    if (agents.length === 0) {
      console.log('⚠️ No active Sales Agents available for assignment');
      return null;
    }

    // Calculate workload for each agent
    // Workload = New leads + Today's follow-up records + Leads with ONLY overdue (no future)
    console.log('🔍 Calculating workload for each agent...');
    const agentWorkloads = await Promise.all(
      agents.map(async (agent) => {
        console.log(`  Checking workload for ${agent.name}...`);
        
        // Count 1: ALL leads with status "new" (need first contact)
        const newLeadsCount = await prisma.lead.count({
          where: {
            assignedToId: agent.id,
            status: 'new',
          },
        });

        // Count 2: Follow-up RECORDS scheduled for TODAY (individual tasks)
        const todayFollowUpsCount = await prisma.followUp.count({
          where: {
            Lead: {
              assignedToId: agent.id,
            },
            scheduledAt: {
              gte: today,
              lt: tomorrow,
            },
            status: {
              notIn: ['completed', 'cancelled'],
            },
          },
        });

        // Count 3: DISTINCT LEADS with ONLY overdue follow-ups (no future scheduled)
        // These are "stuck" leads that need rescue
        const overdueOnlyLeadsCount = await prisma.lead.count({
          where: {
            assignedToId: agent.id,
            status: {
              in: ['new', 'followup', 'qualified'],
            },
            // Has at least one overdue follow-up
            FollowUp: {
              some: {
                scheduledAt: {
                  lt: today,
                },
                status: {
                  notIn: ['completed', 'cancelled'],
                },
              },
            },
            // Has NO future follow-ups
            NOT: {
              FollowUp: {
                some: {
                  scheduledAt: {
                    gte: today,
                  },
                  status: {
                    notIn: ['completed', 'cancelled'],
                  },
                },
              },
            },
          },
        });

        const totalWorkload = newLeadsCount + todayFollowUpsCount + overdueOnlyLeadsCount;

        console.log(`  ${agent.name}: ${totalWorkload} tasks (${newLeadsCount} new + ${todayFollowUpsCount} today + ${overdueOnlyLeadsCount} stuck)`);
        return {
          agentId: agent.id,
          agentName: agent.name,
          todayWorkload: totalWorkload,
        };
      })
    );

    // Find agent with minimum workload
    const leastBusyAgent = agentWorkloads.reduce((min, current) =>
      current.todayWorkload < min.todayWorkload ? current : min
    );

    console.log('📊 Pending Workload Distribution:', agentWorkloads.map(a => `${a.agentName}: ${a.todayWorkload}`).join(', '));
    console.log(`✅ Assigned to: ${leastBusyAgent.agentName} (${leastBusyAgent.todayWorkload} pending tasks)`);

    return leastBusyAgent.agentId;
  } catch (error) {
    console.error('❌ Error calculating workload-based assignment:', error);
    console.error('❌ Full error:', JSON.stringify(error, null, 2));
    return null;
  }
}

// POST create new lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // AC-4 & AC-6: Clean and validate phone numbers
    const cleanedPhone = normalizePhoneForStorage(body.phone);
    const cleanedAltPhone = body.alternatePhone ? normalizePhoneForStorage(body.alternatePhone) : null;
    
    // Validate main phone
    if (!isValidPhone(cleanedPhone)) {
      const error = getPhoneValidationError(body.phone);
      return NextResponse.json(
        { success: false, error: error || 'Invalid phone number' },
        { status: 400 }
      );
    }

    // Check if lead with same phone number already exists
    const existingLead = await prisma.lead.findFirst({
      where: { phone: cleanedPhone },
      include: {
        User_Lead_assignedToIdToUser: { select: { id: true, name: true, email: true } },
        User_Lead_createdByIdToUser: { select: { id: true, name: true, email: true } },
      },
    });

    let lead;
    if (existingLead) {
      // Update existing lead instead of creating new one
      // Preserve: calls, remarks, callAttempts (not touched)
      
      // Cancel all active follow-ups so lead moves to NEW section
      await prisma.followUp.updateMany({
        where: {
          leadId: existingLead.id,
          status: { notIn: ['completed', 'cancelled'] },
        },
        data: {
          status: 'cancelled',
          completedAt: new Date(),
          notes: 'Auto-cancelled: New enquiry received for same lead',
          updatedAt: new Date(),
        },
      });
      
      lead = await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          name: body.name || existingLead.name,
          email: body.email || existingLead.email,
          alternatePhone: cleanedAltPhone || existingLead.alternatePhone,
          address: body.address || existingLead.address,
          city: body.city || existingLead.city,
          state: body.state || existingLead.state,
          pincode: body.pincode || existingLead.pincode,
          source: body.source || existingLead.source,
          campaign: body.campaign || existingLead.campaign,
          customerRequirement: body.customerRequirement || existingLead.customerRequirement,
          // Reset to 'new' for new enquiry, unless already converted/won
          status: ['won', 'converted'].includes(existingLead.status) 
            ? existingLead.status 
            : (body.status || 'new'),
          notes: existingLead.notes && body.notes
            ? `${existingLead.notes}\n\n[${new Date().toISOString()}] ${body.notes}`
            : body.notes || existingLead.notes,
          assignedToId: body.assignedToId || existingLead.assignedToId,
          lead_category: deriveLeadCategory(body.source || existingLead.source, body.lead_category),
          createdAt: new Date(), // Reset lead age for new enquiry
          updatedAt: new Date(),
        },
        include: {
          User_Lead_assignedToIdToUser: { select: { id: true, name: true, email: true } },
          User_Lead_createdByIdToUser: { select: { id: true, name: true, email: true } },
        },
      });
    } else {
      // Determine assignedToId: use provided value or auto-assign via workload-based assignment
      let assignedToId = body.assignedToId || null;
      
      console.log('🟢 POST /api/leads - assignedToId from body:', body.assignedToId);
      console.log('🟢 Checking if should auto-assign:', !assignedToId || assignedToId === 'SYSTEM');
      
      // If "SYSTEM" keyword or null, use workload-based auto-assignment
      if (!assignedToId || assignedToId === 'SYSTEM') {
        console.log('🟢 Calling getNextAgentForRoundRobin...');
        assignedToId = await getNextAgentForRoundRobin();
        console.log('🟢 Result from getNextAgentForRoundRobin:', assignedToId);
      }

      // Create new lead
      lead = await prisma.lead.create({
        data: {
          id: randomUUID(),
          name: body.name,
          phone: cleanedPhone,
          email: body.email || null,
          alternatePhone: cleanedAltPhone,
          address: body.address || null,
          city: body.city || null,
          state: body.state || null,
          pincode: body.pincode || null,
          source: body.source,
          campaign: body.campaign || null,
          customerRequirement: body.customerRequirement || null,
          status: body.status || 'new',
          notes: body.notes || null,
          assignedToId: assignedToId,
          createdById: body.createdById || null,
          lead_category: deriveLeadCategory(body.source, body.lead_category),
          updatedAt: new Date(),
        },
        include: {
          User_Lead_assignedToIdToUser: { select: { id: true, name: true, email: true } },
          User_Lead_createdByIdToUser: { select: { id: true, name: true, email: true } },
        },
      });
    }

    // Log activity
    if (lead.id) {
      await prisma.activityHistory.create({
        data: {
          id: randomUUID(),
          leadId: lead.id,
          userId: body.createdById || 'system',
          action: existingLead ? 'updated' : 'created',
          description: existingLead
            ? `Lead "${lead.name}" was updated with new information. Merged with existing lead to preserve history.`
            : `Lead "${lead.name}" was created${!existingLead && lead.assignedToId && !body.assignedToId ? ' and auto-assigned' : ''}`,
        },
      });

      // Send notification if lead is assigned (only for new leads, not updates)
      if (!existingLead && lead.assignedToId && lead.assignedToId !== null) {
        try {
          const assignerName = body.createdById ? 
            (await prisma.user.findUnique({ where: { id: body.createdById } }))?.name ?? undefined : undefined;
          await notifyLeadAssigned(lead.id, lead.name, String(lead.assignedToId), assignerName);
        } catch (error) {
          console.error('Failed to send lead assignment notification:', error);
        }
      }
    }

    // Transform the response to match frontend expectations
    const transformedLead = {
      ...lead,
      assignedTo: lead.User_Lead_assignedToIdToUser,
      createdBy: lead.User_Lead_createdByIdToUser,
      User_Lead_assignedToIdToUser: undefined,
      User_Lead_createdByIdToUser: undefined,
    };

    return NextResponse.json(
      { success: true, data: transformedLead },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create lead' },
      { status: 500 }
    );
  }
}





