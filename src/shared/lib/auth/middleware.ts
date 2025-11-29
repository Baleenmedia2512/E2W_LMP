import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyToken } from './auth-utils';
import prisma from '../db/prisma';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string;
    email: string;
    roleId: string;
    roleName: string;
  };
}

export interface ProtectionOptions {
  requireRoles?: string[];
}

/**
 * Middleware to authenticate requests
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedRequest> {
  const authHeader = request.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      (request as AuthenticatedRequest).user = payload;
    }
  }

  return request as AuthenticatedRequest;
}

/**
 * Middleware to check permissions based on roles
 */
export function requireAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const authReq = await authenticateRequest(req);

    if (!authReq.user) {
      return NextResponse.json(
        { error: 'Unauthorized: No valid token provided' },
        { status: 401 }
      );
    }

    return handler(authReq);
  };
}

/**
 * Middleware to check role-based access
 */
export function requireRole(...roleNames: string[]) {
  return (handler: (req: AuthenticatedRequest) => Promise<NextResponse>) => {
    return async (req: NextRequest) => {
      const authReq = await authenticateRequest(req);

      if (!authReq.user) {
        return NextResponse.json(
          { error: 'Unauthorized: No valid token provided' },
          { status: 401 }
        );
      }

      if (!roleNames.includes(authReq.user.roleName)) {
        return NextResponse.json(
          { error: `Forbidden: Required roles are ${roleNames.join(', ')}` },
          { status: 403 }
        );
      }

      return handler(authReq);
    };
  };
}

/**
 * Check if user has specific permission
 */
export async function hasPermission(
  userId: string,
  permissionKey: string
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || !user.role.permissions) return false;

    const permissions = user.role.permissions as Record<string, boolean>;
    return permissions[permissionKey] === true;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Get user with role information
 */
export async function getUserWithRole(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });
}
