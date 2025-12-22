import { auth0 } from '@/lib/auth0';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client with the current Auth0 user context.
 * Uses service role key for database operations since we're handling
 * authentication through Auth0 instead of Supabase Auth.
 * 
 * @returns Object containing supabase client and userId from Auth0
 */
export async function getSupabaseWithUser() {
  let userId: string | null = null;
  
  // Get session from Auth0 if configured
  if (auth0) {
    try {
      const session = await auth0.getSession();
      userId = session?.user?.sub || null;
    } catch (err) {
      console.error('Failed to get Auth0 session:', err);
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Return mock client if Supabase is not configured
  if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('placeholder')) {
    return {
      supabase: createMockSupabaseClient(),
      userId: userId || 'mock-user',
    };
  }

  const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

  return { supabase, userId };
}

/**
 * Legacy function for backward compatibility.
 * Creates a Supabase client (server-side).
 * 
 * @deprecated Use getSupabaseWithUser() instead for Auth0 integration
 */
export async function createClient() {
  const { supabase } = await getSupabaseWithUser();
  return supabase;
}

/**
 * Creates a mock Supabase client for development/testing
 * when Supabase credentials are not configured.
 */
function createMockSupabaseClient() {
  const createMockQueryBuilder = () => {
    const emptyResult = { data: null, error: null, count: 0 };

    const builder: any = new Promise((resolve) => {
      setTimeout(() => resolve(emptyResult), 0);
    });

    builder.select = () => builder;
    builder.insert = () => builder;
    builder.update = () => builder;
    builder.delete = () => builder;
    builder.upsert = () => builder;
    builder.order = () => builder;
    builder.limit = () => builder;
    builder.eq = () => builder;
    builder.in = () => builder;
    builder.single = () => Promise.resolve(emptyResult);

    return builder;
  };

  return {
    from: () => createMockQueryBuilder(),
  } as any;
}
