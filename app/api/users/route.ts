import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createApiError } from '@/lib/api-middleware';
import prisma from '@/lib/prisma';
import { Session } from 'next-auth';

export async function GET(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;
      const searchParams = request.nextUrl.searchParams;
      const role = searchParams.get('role');

      // Build where clause
      const where: Record<string, unknown> = {
        isActive: true,
      };

      // Filter by role if provided
      if (role) {
        where.role = {
          name: role,
        };
      }

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      return createApiResponse(users);
    } catch (error) {
      console.error('Get users error:', error);
      return createApiError('Failed to fetch users', 500);
    }
  });
}
