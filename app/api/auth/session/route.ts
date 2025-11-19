import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createApiResponse, createApiError } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return createApiError('Not authenticated', 401);
    }

    return createApiResponse(session);
  } catch (error) {
    console.error('Session API error:', error);
    return createApiError('Failed to fetch session', 500);
  }
}
