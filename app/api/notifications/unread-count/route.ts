import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createApiError } from '@/lib/api-middleware';
import prisma from '@/lib/prisma';
import { Session } from 'next-auth';

export async function GET(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;

      const unreadCount = await prisma.notification.count({
        where: {
          userId: sess.user.id,
          isRead: false,
        },
      });

      return createApiResponse({ unreadCount });
    } catch (error) {
      console.error('Get unread count error:', error);
      return createApiError('Failed to fetch unread count', 500);
    }
  });
}
