import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createApiError } from '@/lib/api-middleware';
import prisma from '@/lib/prisma';
import { Session } from 'next-auth';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;
      const searchParams = request.nextUrl.searchParams;
      
      const from = searchParams.get('from');
      const to = searchParams.get('to');

      if (!from || !to) {
        return createApiError('from and to date parameters are required', 400);
      }

      const startDate = startOfDay(new Date(from));
      const endDate = endOfDay(new Date(to));

      // Get status breakdown - count leads by status updated in the period
      const statusBreakdown = await prisma.lead.groupBy({
        by: ['status'],
        where: {
          updatedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          status: true,
        },
      });

      // Format the data
      const breakdown = statusBreakdown.map(item => ({
        status: item.status,
        count: item._count.status,
      }));

      // Calculate total for percentages
      const total = breakdown.reduce((sum, item) => sum + item.count, 0);
      
      const breakdownWithPercentages = breakdown.map(item => ({
        ...item,
        percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
      }));

      return createApiResponse({
        breakdown: breakdownWithPercentages,
        total,
      });
    } catch (error) {
      console.error('Status Breakdown API error:', error);
      return createApiError('Failed to fetch status breakdown', 500);
    }
  });
}
