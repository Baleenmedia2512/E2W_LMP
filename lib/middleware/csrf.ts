import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_NAME = 'csrf-token';

// Generate CSRF token
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Verify CSRF token
export function verifyCSRFToken(token: string, sessionToken?: string): boolean {
  if (!token) return false;
  
  // In production, verify token is associated with session
  // For now, just check it exists and has correct format
  return /^[a-f0-9]{64}$/.test(token);
}

// CSRF middleware for API routes
export async function csrfProtection(req: NextRequest): Promise<NextResponse | null> {
  // Only protect state-changing methods
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return null; // Allow GET, HEAD, OPTIONS
  }

  // Skip CSRF for webhook endpoints
  if (req.nextUrl.pathname.includes('/webhook')) {
    return null;
  }

  // Get CSRF token from header
  const csrfToken = req.headers.get(CSRF_HEADER_NAME);
  
  // Get CSRF token from cookie
  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;

  // Verify tokens match and are valid
  if (!csrfToken || !cookieToken || csrfToken !== cookieToken) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid CSRF token. Please refresh the page and try again.',
      },
      { status: 403 }
    );
  }

  if (!verifyCSRFToken(csrfToken)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid CSRF token format.',
      },
      { status: 403 }
    );
  }

  return null; // Token valid, continue
}

// Helper to set CSRF token in response
export function setCSRFCookie(response: NextResponse, token?: string): NextResponse {
  const csrfToken = token || generateCSRFToken();
  
  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false, // Must be accessible to JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return response;
}
