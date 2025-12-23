import { NextRequest, NextResponse } from 'next/server';

// Simple redirect to Auth0 for login
export async function GET(
  request: NextRequest,
  { params }: { params: { auth0: string } }
) {
  const route = params.auth0;
  const baseUrl = process.env.AUTH0_BASE_URL || process.env.VERCEL_URL;
  const issuer = process.env.AUTH0_ISSUER_BASE_URL;
  const clientId = process.env.AUTH0_CLIENT_ID;

  if (route === 'login') {
    // Redirect to Auth0 login
    const redirectUri = `${baseUrl}/api/auth/callback`;
    const authUrl = `${issuer}/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid profile email`;
    return NextResponse.redirect(authUrl);
  }

  if (route === 'logout') {
    // Redirect to Auth0 logout
    const logoutUrl = `${issuer}/v2/logout?client_id=${clientId}&returnTo=${encodeURIComponent(baseUrl || '')}`;
    return NextResponse.redirect(logoutUrl);
  }

  if (route === 'callback') {
    // Handle OAuth callback - for now just redirect to dashboard
    return NextResponse.redirect(`${baseUrl}/dashboard`);
  }

  return new NextResponse('Not Found', { status: 404 });
}

export async function POST(request: NextRequest) {
  return GET(request, { params: { auth0: 'login' } });
}
