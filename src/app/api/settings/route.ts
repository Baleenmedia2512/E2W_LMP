import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';

// Get current user ID from headers or session (simplified)
const getCurrentUserId = (request: NextRequest): string | null => {
  // In a production app, extract from JWT or session
  // For now, get from custom header or request context
  const userId = request.headers.get('x-user-id');
  return userId;
};

export async function GET(request: NextRequest) {
  try {
    const userId = getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user settings from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        settings: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return settings or default values
    const settings = user.settings || {
      companyName: 'E2W LMP',
      emailNotifications: true,
      smsNotifications: true,
      autoAssignLeads: false,
      defaultLeadSource: 'Website',
      workingHoursStart: '09:00',
      workingHoursEnd: '18:00',
      timezone: 'Asia/Kolkata',
    };

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      companyName,
      emailNotifications,
      smsNotifications,
      autoAssignLeads,
      defaultLeadSource,
      workingHoursStart,
      workingHoursEnd,
      timezone,
    } = body;

    // Validate working hours
    if (workingHoursStart && workingHoursEnd) {
      const [startHour, startMin] = workingHoursStart.split(':').map(Number);
      const [endHour, endMin] = workingHoursEnd.split(':').map(Number);

      const startInMinutes = startHour * 60 + startMin;
      const endInMinutes = endHour * 60 + endMin;

      if (endInMinutes <= startInMinutes) {
        return NextResponse.json(
          { error: 'End time must be after start time' },
          { status: 400 }
        );
      }
    }

    // Update user settings in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        settings: {
          companyName,
          emailNotifications,
          smsNotifications,
          autoAssignLeads,
          defaultLeadSource,
          workingHoursStart,
          workingHoursEnd,
          timezone,
        },
      },
      select: {
        settings: true,
      },
    });

    return NextResponse.json({
      message: 'Settings updated successfully',
      settings: updatedUser.settings,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
