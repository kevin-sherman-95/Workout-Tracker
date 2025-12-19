import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // BYPASS AUTH FOR TESTING - Return a mock client if credentials are missing
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
    // Return a mock client that won't throw errors
    const createMockQueryBuilder = () => {
      const emptyResult = { data: null, error: null, count: 0 };
      
      const builder: any = new Promise((resolve) => {
        // Resolve immediately with empty data
        setTimeout(() => resolve(emptyResult), 0);
      });
      
      // Add chainable methods that return the same promise
      builder.select = (cols?: string | { count?: string; head?: boolean }) => {
        if (cols && typeof cols === 'object' && cols.count) {
          return Promise.resolve(emptyResult);
        }
        return builder;
      };
      builder.order = () => builder;
      builder.limit = () => builder;
      builder.eq = () => builder;
      builder.in = () => builder;
      
      return builder;
    };
    
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
      },
      from: () => createMockQueryBuilder(),
    } as any
  }

  const cookieStore = await cookies()

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

