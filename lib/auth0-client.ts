import { Auth0Client } from "@auth0/nextjs-auth0/server";

// Simple Auth0 client for middleware - no Supabase imports allowed here
// (Edge Runtime doesn't support Node.js APIs used by Supabase)
export const auth0 = new Auth0Client({
  // The client reads from environment variables automatically:
  // AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET, APP_BASE_URL
  
  authorizationParameters: {
    // Always show the account picker screen
    prompt: 'select_account',
  },
});
