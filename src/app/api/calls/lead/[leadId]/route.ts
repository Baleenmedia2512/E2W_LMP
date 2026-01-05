import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';

// GET all call attempts for a specific lead
export async function GET(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const { leadId } = params;

    // Get the lead details
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
      },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Get all call attempts/logs for this lead
    const callLogs = await prisma.callLog.findMany({
      where: { leadId },
      include: {
        User: {
          select: {
            name: true,
            email: true,
            Role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Transform the data to match component expectations
    const attempts = callLogs.map((log: any, index: number) => ({
      id: log.id,
      attemptNumber: index + 1,
      startedAt: log.createdAt.toISOString(),
      endedAt: log.createdAt.toISOString(),
      duration: log.duration,
      callStatus: log.callStatus,
      remarks: log.remarks || log.customerRequirement,
      caller: {
        name: log.User.name,
        email: log.User.email,
        role: {
          name: log.User.Role?.name || 'Unknown',
        },
      },
    }));

    return NextResponse.json({
      success: true,
      data: {
        lead,
        attempts,
        totalAttempts: attempts.length,
      },
    });
  } catch (error) {
    console.error('Error fetching call attempts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch call attempts' },
      { status: 500 }
    );
  }
}
