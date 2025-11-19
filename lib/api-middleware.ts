import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { RoleName } from '@/lib/roles';

export async function withAuth(handler: (session: unknown) => Promise<NextResponse>) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.user.isActive) {
    return NextResponse.json({ success: false, error: 'Account is inactive' }, { status: 403 });
  }

  return handler(session);
}

export async function withRole(
  allowedRoles: RoleName[],
  handler: (session: unknown) => Promise<NextResponse>
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.user.isActive) {
    return NextResponse.json({ success: false, error: 'Account is inactive' }, { status: 403 });
  }

  if (!allowedRoles.includes(session.user.role as RoleName)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  return handler(session);
}

export function createApiResponse<T>(data: T, message?: string) {
  return NextResponse.json({
    success: true,
    data,
    message,
  });
}

export function createApiError(error: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}
