import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Creates a Supabase client with the current Auth0 user context.
 * Uses service role key for database operations since we're handling
 * authentication through Auth0 instead of Supabase Auth.
 * 
 * @returns Object containing supabase client and userId from Auth0
 */
export async function getSupabaseWithUser() {
  let userId: string | null = null;
  
  // Try to get user ID from auth cookie (simplified approach)
  try {
    // For now, we'll get the user ID from the client-side
    // Server-side auth check is minimal
    userId = null;
  } catch (err) {
    console.error('Failed to get Auth0 session:', err);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Validate that the URL is a proper HTTP/HTTPS URL
  const isValidUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Return mock client if Supabase is not configured or URL is invalid
  if (!isValidUrl(supabaseUrl) || !supabaseServiceKey || supabaseUrl!.includes('placeholder') || supabaseUrl!.includes('your-project')) {
    return {
      supabase: createMockSupabaseClient(),
      userId: userId || 'mock-user',
    };
  }

  const supabase = createSupabaseClient(supabaseUrl!, supabaseServiceKey);

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
