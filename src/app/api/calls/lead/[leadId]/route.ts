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
    const attempts = await prisma.callLog.findMany({
      where: { leadId },
      include: {
        caller: {
          select: {
            name: true,
            email: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

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
