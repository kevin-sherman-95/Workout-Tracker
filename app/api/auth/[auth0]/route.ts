import { NextResponse } from 'next/server';

// Check if Auth0 is configured
const isAuth0Configured = !!(
  process.env.AUTH0_DOMAIN &&
  process.env.AUTH0_CLIENT_ID &&
  process.env.AUTH0_CLIENT_SECRET &&
  process.env.AUTH0_SECRET &&
  process.env.APP_BASE_URL &&
  !process.env.AUTH0_DOMAIN.includes('YOUR_') &&
  !process.env.AUTH0_CLIENT_ID.includes('YOUR_') &&
  !process.env.AUTH0_DOMAIN.includes('placeholder')
);

// Fallback handler when Auth0 is not configured
const unconfiguredHandler = async () => {
  return NextResponse.json(
    { error: 'Auth0 is not configured. Please set up Auth0 environment variables.' },
    { status: 503 }
  );
};

// Initialize handlers - only import Auth0 if configured
let GET: any = unconfiguredHandler;
let POST: any = unconfiguredHandler;

if (isAuth0Configured) {
  try {
    // Use require to avoid top-level import issues
    const auth0Module = require('@auth0/nextjs-auth0');
    const handlers = auth0Module.handleAuth();
    GET = handlers.GET;
    POST = handlers.POST;
  } catch (error: any) {
    console.warn('Auth0 handleAuth failed:', error?.message || error);
    // Keep fallback handlers
  }
}

export { GET, POST };
