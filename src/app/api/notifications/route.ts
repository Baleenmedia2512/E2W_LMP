import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/shared/lib/db/prisma';
import { randomUUID } from 'crypto';

// GET all notifications for current user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          User: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: notifications,
      total,
      page,
      pageSize: limit,
      hasMore: skip + limit < total,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST create new notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const notification = await prisma.notification.create({
      data: {
        id: randomUUID(),
        userId: body.userId,
        type: body.type || 'info',
        title: body.title,
        message: body.message,
      },
      include: {
        User: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(
      { success: true, data: notification },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

// PATCH update notifications (mark as read)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, notificationId, userId } = body;

    if (action === 'mark-read' && notificationId) {
      // Mark single notification as read
      const notification = await prisma.notification.update({
        where: { id: notificationId },
        data: { 
          isRead: true,
          readAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        data: notification,
        message: 'Notification marked as read',
      });
    } else if (action === 'mark-all-read' && userId) {
      // Mark all notifications as read for user
      const result = await prisma.notification.updateMany({
        where: { 
          userId,
          isRead: false,
        },
        data: { 
          isRead: true,
          readAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        data: { count: result.count },
        message: `${result.count} notifications marked as read`,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action or missing parameters' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

// DELETE notification(s)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, userId, action } = body;

    if (action === 'clear-all' && userId) {
      // Clear all notifications for user
      const result = await prisma.notification.deleteMany({
        where: { userId },
      });

      return NextResponse.json({
        success: true,
        message: `${result.count} notifications cleared`,
        data: { count: result.count },
      });
    } else if (notificationId) {
      // Delete single notification
      await prisma.notification.delete({
        where: { id: notificationId },
      });

      return NextResponse.json({
        success: true,
        message: 'Notification deleted',
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
