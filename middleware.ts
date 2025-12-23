import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth0, isAuth0Configured } from '@/lib/auth0';

export async function middleware(request: NextRequest) {
  // If Auth0 is not configured, allow all routes (development mode)
  if (!isAuth0Configured()) {
    console.warn('Auth0 not configured - running in development mode without authentication');
    return NextResponse.next();
  }

  // Let Auth0 middleware handle authentication
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
