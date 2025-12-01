import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { verifyToken } from '@/shared/lib/auth/auth-utils';

// Get current user ID from headers or session
const getCurrentUserId = async (request: NextRequest): Promise<string | null> => {
  try {
    // First check custom header (for direct API calls)
    const userId = request.headers.get('x-user-id');
    if (userId) return userId;

    // Then check authorization token
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = await verifyToken(token);
      return decoded?.userId || null;
    }

    return null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
};

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
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
    const userId = await getCurrentUserId(request);
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

    // Validate timezone
    const validTimezones = [
      'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
      'Asia/Kolkata', 'Europe/London', 'Europe/Paris', 'Asia/Dubai', 'Asia/Singapore',
      'Australia/Sydney', 'Pacific/Auckland'
    ];
    if (timezone && !validTimezones.includes(timezone)) {
      return NextResponse.json(
        { error: 'Invalid timezone' },
        { status: 400 }
      );
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
