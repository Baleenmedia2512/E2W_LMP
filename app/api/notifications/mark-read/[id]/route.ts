import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createApiError } from '@/lib/api-middleware';
import prisma from '@/lib/prisma';
import { Session } from 'next-auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;
      const notificationId = params.id;

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
      console.error('Mark notification as read error:', error);
      return createApiError('Failed to mark notification as read', 500);
    }
  });
}
