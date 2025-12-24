import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { syncUserToSupabase } from "./auth0";

export const auth0 = new Auth0Client({
  // The client reads from environment variables automatically:
  // AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET, APP_BASE_URL
  
  // Sync user to Supabase after login
  beforeSessionSaved: async (session) => {
    if (session?.user) {
      await syncUserToSupabase(session.user);
    }
    return session;
  },
});
