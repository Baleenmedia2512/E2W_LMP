import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createApiError } from '@/lib/api-middleware';
import prisma from '@/lib/prisma';
import { Session } from 'next-auth';

export async function PATCH(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;

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
    } catch (error) {
      console.error('Mark all as read error:', error);
      return createApiError('Failed to mark all notifications as read', 500);
    }
  });
}
