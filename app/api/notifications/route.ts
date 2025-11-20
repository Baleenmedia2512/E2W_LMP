import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createApiError } from '@/lib/api-middleware';
import prisma from '@/lib/prisma';
import { Session } from 'next-auth';

export async function GET(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;
      const searchParams = request.nextUrl.searchParams;
      const unreadOnly = searchParams.get('unreadOnly') === 'true';
      const limit = parseInt(searchParams.get('limit') || '50');
      const page = parseInt(searchParams.get('page') || '1');
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {
        userId: sess.user.id,
      };

      if (unreadOnly) {
        where.isRead = false;
      }

      const [notifications, totalCount, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: {
            createdAt: 'desc',
          },
          take: limit,
          skip,
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({
          where: {
            userId: sess.user.id,
            isRead: false,
          },
        }),
      ]);

      return createApiResponse({
        notifications,
        unreadCount,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      return createApiError('Failed to fetch notifications', 500);
    }
  });
}

// Mark notification as read
export async function PUT(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;
      const body = await request.json();
      const { notificationId, markAllRead } = body;

      if (markAllRead) {
        await prisma.notification.updateMany({
          where: {
            userId: sess.user.id,
            isRead: false,
          },
          data: {
            isRead: true,
            readAt: new Date(),
          },
        });

        return createApiResponse(null, 'All notifications marked as read');
      }

      if (!notificationId) {
        return createApiError('Notification ID is required', 400);
      }

      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        return createApiError('Notification not found', 404);
      }

      if (notification.userId !== sess.user.id) {
        return createApiError('Unauthorized', 403);
      }

      const updated = await prisma.notification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return createApiResponse(updated, 'Notification marked as read');
    } catch (error) {
      console.error('Update notification error:', error);
      return createApiError('Failed to update notification', 500);
    }
  });
}
