import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Check if Auth0 is properly configured
 */
export function isAuth0Configured(): boolean {
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID;
  const clientSecret = process.env.AUTH0_CLIENT_SECRET;
  const secret = process.env.AUTH0_SECRET;
  const baseUrl = process.env.APP_BASE_URL;

  return !!(
    domain &&
    clientId &&
    clientSecret &&
    secret &&
    baseUrl &&
    !domain.includes('YOUR_') &&
    !clientId.includes('YOUR_') &&
    !clientSecret.includes('YOUR_') &&
    !secret.includes('REPLACE_')
  );
}

/**
 * Create Auth0 client instance with custom configuration
 * Configured to always show Google account picker with prompt=select_account
 * This forces Google to display the account selection screen on every login
 */
export const auth0 = new Auth0Client({
  authorizationParams: {
    prompt: 'select_account',
    max_age: 0, // Force re-authentication
  },
});

/**
 * Helper to sync user to Supabase after Auth0 login
 */
export async function syncUserToSupabase(user: any) {
  if (!user) return;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Only sync if Supabase is configured
  if (supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('placeholder')) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Upsert user in Supabase users table
      await supabase.from('users').upsert(
        {
          id: user.sub,
          email: user.email,
          name: user.name || user.nickname,
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

