import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * Check if Auth0 is properly configured
 */
export function isAuth0Configured(): boolean {
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID;
  const clientSecret = process.env.AUTH0_CLIENT_SECRET;
  const secret = process.env.AUTH0_SECRET;

  return !!(
    domain &&
    clientId &&
    clientSecret &&
    secret &&
    !domain.includes('YOUR_') &&
    !clientId.includes('YOUR_') &&
    !clientSecret.includes('YOUR_') &&
    !secret.includes('REPLACE_')
  );
}

/**
 * Shared Auth0 client instance for server-side operations.
 * Uses environment variables for configuration:
 * - AUTH0_SECRET
 * - AUTH0_DOMAIN (or AUTH0_ISSUER_BASE_URL)
 * - AUTH0_CLIENT_ID
 * - AUTH0_CLIENT_SECRET
 * - APP_BASE_URL (or AUTH0_BASE_URL)
 */
function createAuth0Client(): Auth0Client | null {
  if (!isAuth0Configured()) {
    console.warn('Auth0 is not configured. Please set up environment variables.');
    return null;
  }

  return new Auth0Client({
    // Sync user to Supabase after successful login
    async onCallback(error, context, session) {
      const baseUrl = process.env.APP_BASE_URL || process.env.AUTH0_BASE_URL || 'http://localhost:3000';
      
      if (error) {
        console.error('Auth0 callback error:', error);
        return NextResponse.redirect(new URL('/login?error=auth_failed', baseUrl));
      }

      // Sync user to Supabase if session exists
      if (session?.user) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        // Only sync if Supabase is configured
        if (supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('placeholder')) {
          try {
            const supabase = createClient(supabaseUrl, supabaseServiceKey);

            // Upsert user in Supabase users table
            await supabase.from('users').upsert(
              {
                id: session.user.sub,
                email: session.user.email,
                name: session.user.name || session.user.nickname,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'id' }
            );
          } catch (err) {
            console.error('Failed to sync user to Supabase:', err);
            // Don't fail the login if Supabase sync fails
          }
        }
      }

      // Redirect to dashboard after successful login
      const returnTo = context.returnTo || '/dashboard';
      return NextResponse.redirect(new URL(returnTo, baseUrl));
    },
  });
}

export const auth0 = createAuth0Client();
