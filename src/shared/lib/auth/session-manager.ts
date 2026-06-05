import { generateToken, JWTPayload } from './auth-utils';
import prisma from '@/shared/lib/db/prisma';
import crypto from 'crypto';

const SESSION_EXPIRY_DAYS = parseInt(process.env.SESSION_EXPIRY_DAYS || '3650'); // 10 years
const REFRESH_TOKEN_EXPIRY_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || '3650'); // 10 years

export interface SessionData {
  token: string;
  refreshToken: string;
  expiresAt: Date;
}

/**
 * Generate a refresh token
 */
function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a new session for a user
 */
export async function createSession(
  userId: string,
  email: string,
  roleId: string,
  roleName: string,
  ipAddress?: string,
  userAgent?: string,
  deviceInfo?: string
): Promise<SessionData> {
  // Generate JWT token
  const payload: JWTPayload = {
    userId,
    email,
    roleId,
    roleName,
  };
  const token = generateToken(payload);

  // Generate refresh token
  const refreshToken = generateRefreshToken();

  // Calculate expiration dates
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  // Create session in database
  await prisma.session.create({
    data: {
      userId,
      token,
      refreshToken,
      deviceInfo,
      ipAddress,
      userAgent,
      lastActivityAt: new Date(),
      expiresAt: refreshExpiresAt, // Use refresh token expiry for session
    },
  });

  return {
    token,
    refreshToken,
    expiresAt,
  };
}

/**
 * Validate and refresh a session
 */
export async function refreshSession(refreshToken: string): Promise<SessionData | null> {
  const session = await prisma.session.findUnique({
    where: { refreshToken },
    include: { User: { include: { Role: true } } },
  });

  if (!session) {
    return null;
  }

  // Check if session is expired
  if (new Date() > session.expiresAt) {
    // Delete expired session
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  // Generate new tokens
  const newToken = generateToken({
    userId: session.userId,
    email: session.User.email,
    roleId: session.User.roleId,
    roleName: session.User.Role.name,
  });

  const newRefreshToken = generateRefreshToken();
  const newExpiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const newRefreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  // Update session with new tokens
  await prisma.session.update({
    where: { id: session.id },
    data: {
      token: newToken,
      refreshToken: newRefreshToken,
      lastActivityAt: new Date(),
      expiresAt: newRefreshExpiresAt,
    },
  });

  return {
    token: newToken,
    refreshToken: newRefreshToken,
    expiresAt: newExpiresAt,
  };
}

/**
 * Revoke a specific session
 */
export async function revokeSession(token: string): Promise<boolean> {
  try {
    await prisma.session.delete({ where: { token } });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Revoke all sessions for a user
 */
export async function revokeAllUserSessions(userId: string): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: { userId },
  });
  return result.count;
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string) {
  return prisma.session.findMany({
    where: {
      userId,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      lastActivityAt: 'desc',
    },
  });
}

/**
 * Clean up expired sessions (can be run as a cron job)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
  return result.count;
}

/**
 * Update session activity timestamp
 */
export async function updateSessionActivity(token: string): Promise<boolean> {
  try {
    await prisma.session.update({
      where: { token },
      data: { lastActivityAt: new Date() },
    });
    return true;
  } catch (error) {
    return false;
  }
}
