import { NextRequest, NextResponse } from 'next/server';
import { auth0, isAuth0Configured } from '@/lib/auth0';

export async function middleware(request: NextRequest) {
  // If Auth0 is not configured, allow all routes (development mode)
  if (!isAuth0Configured() || !auth0) {
    console.warn('Auth0 not configured - running in development mode without authentication');
    return NextResponse.next();
  }

  // Auth0 handles the authentication middleware
  const authResponse = await auth0.middleware(request);

  // If Auth0 middleware returns a response (redirect, etc.), use it
  if (authResponse.status !== 200 || authResponse.headers.get('location')) {
    return authResponse;
  }

  // For protected routes, check if user is authenticated
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const session = await auth0.getSession();
    
    if (!session) {
      // Redirect to login if not authenticated
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // If user is authenticated and trying to access login/signup, redirect to dashboard
  if (
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/signup')
  ) {
    const session = await auth0.getSession();
    
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return authResponse;
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
