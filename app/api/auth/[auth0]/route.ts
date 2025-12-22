import { auth0 } from '@/lib/auth0';
import { createClient } from '@supabase/supabase-js';

// Handle all Auth0 authentication routes
export const GET = auth0.handleAuth({
  async onCallback(error, context) {
    if (error) {
      console.error('Auth0 callback error:', error);
      throw error;
    }

    // Sync user to Supabase after successful login
    const session = context.session;
    if (session?.user) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      // Only sync if Supabase is configured
      if (supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('placeholder')) {
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
      }
    }
  },
});
