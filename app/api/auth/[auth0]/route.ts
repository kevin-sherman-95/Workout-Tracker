import { handleAuth, handleCallback, handleLogin } from '@auth0/nextjs-auth0';
import { syncUserToSupabase } from '@/lib/auth0';

// Use handleAuth() which automatically reads from environment variables:
// AUTH0_SECRET, AUTH0_BASE_URL, AUTH0_ISSUER_BASE_URL, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET

export const GET = handleAuth({
  login: handleLogin({
    authorizationParams: {
      // Force account selection on every login
      prompt: 'select_account',
    },
  }),
  callback: handleCallback({
    afterCallback: async (req, session) => {
      // Sync user to Supabase after successful login
      if (session?.user) {
        await syncUserToSupabase(session.user);
      }
      return session;
    },
  }),
});

export const POST = handleAuth();
