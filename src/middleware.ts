import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // List of routes that should be accessible without authentication
  // Client-side auth context will handle actual auth checks
  const publicRoutes = ['/login', '/api/auth/login', '/'];

  // Allow all public routes and API routes to pass through
  // Client-side auth context handles actual protection
  if (publicRoutes.some(route => pathname.startsWith(route)) || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // For all other routes, let the client-side auth context handle the redirect
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
