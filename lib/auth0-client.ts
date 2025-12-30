import { Auth0Client } from "@auth0/nextjs-auth0/server";

// Simple Auth0 client for middleware - no Supabase imports allowed here
// (Edge Runtime doesn't support Node.js APIs used by Supabase)

// Check if Auth0 is configured
function isAuth0Configured(): boolean {
  return !!(
    process.env.AUTH0_DOMAIN &&
    process.env.AUTH0_CLIENT_ID &&
    process.env.AUTH0_CLIENT_SECRET &&
    process.env.AUTH0_SECRET &&
    process.env.APP_BASE_URL &&
    !process.env.AUTH0_DOMAIN.includes('YOUR_') &&
    !process.env.AUTH0_CLIENT_ID.includes('YOUR_') &&
    !process.env.AUTH0_DOMAIN.includes('placeholder')
  );
}

// Initialize Auth0 client with error handling
let auth0Instance: Auth0Client | null = null;

if (isAuth0Configured()) {
  try {
    auth0Instance = new Auth0Client({
      authorizationParameters: {
        prompt: 'select_account',
      },
    });
  } catch (error) {
    console.warn('Auth0 client initialization failed:', error);
    auth0Instance = null;
  }
}

// Create a safe wrapper that handles missing Auth0 configuration
export const auth0 = {
  middleware: async (request: any) => {
    if (auth0Instance) {
      return auth0Instance.middleware(request);
    }
    // If Auth0 is not configured, allow request to proceed
    const { NextResponse } = await import('next/server');
    return NextResponse.next();
  },
  getSession: async () => {
    if (auth0Instance) {
      return auth0Instance.getSession();
    }
    return null;
  },
} as Auth0Client;
