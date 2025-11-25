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
      const includeInactive = searchParams.get('includeInactive') === 'true';

      // Build where clause
      const where: Record<string, unknown> = includeInactive ? {} : {
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
          isActive: true,
          createdAt: true,
          updatedAt: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Format for compatibility with manage users page
      const formattedUsers = users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

      return createApiResponse({
        users: formattedUsers,
        total: formattedUsers.length,
      });
    } catch (error) {
      console.error('Get users error:', error);
      return createApiError('Failed to fetch users', 500);
    }
  });
}
