import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth0 } from "./lib/auth0-client";

export async function middleware(request: NextRequest) {
  try {
    // Check if Auth0 is configured by checking for required env vars
    const isAuth0Configured = !!(
      process.env.AUTH0_DOMAIN &&
      process.env.AUTH0_CLIENT_ID &&
      process.env.AUTH0_CLIENT_SECRET &&
      process.env.AUTH0_SECRET &&
      process.env.APP_BASE_URL &&
      !process.env.AUTH0_DOMAIN.includes('YOUR_') &&
      !process.env.AUTH0_CLIENT_ID.includes('YOUR_')
    );

    if (!isAuth0Configured) {
      // If Auth0 is not configured, allow the request to proceed
      // The login page will handle showing the appropriate UI
      return NextResponse.next();
    }

    return await auth0.middleware(request);
  } catch (error) {
    // If Auth0 middleware fails, log and allow request to proceed
    console.error('Auth0 middleware error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
