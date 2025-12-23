import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase browser client for client-side database operations.
 * Note: Authentication is handled by Auth0, not Supabase.
 * This client is used for client-side database queries only.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

  // Return a mock client if credentials are missing or URL is invalid
  if (!isValidUrl(supabaseUrl) || !supabaseKey || 
      supabaseUrl!.includes('placeholder') || 
      supabaseUrl === 'your_supabase_url') {
    return createMockClient();
  }

  return createBrowserClient(supabaseUrl!, supabaseKey);
}

/**
 * Helper to check if we're in mock mode
 */
export function isInMockMode(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey || 
      supabaseUrl.includes('placeholder') || 
      supabaseUrl === 'your_supabase_url') {
    return true;
  }
  
  try {
    const parsed = new URL(supabaseUrl);
    return !(parsed.protocol === 'http:' || parsed.protocol === 'https:');
  } catch {
    return true;
  }
}

/**
 * Creates a mock Supabase client for development/testing
 * when Supabase credentials are not configured.
 */
function createMockClient() {
  // Store mock data in localStorage for persistence across page reloads
  const getMockData = (key: string) => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`mock-${key}`);
      if (stored) {
        return JSON.parse(stored);
      }
    }
    return [];
  };

  const setMockData = (key: string, data: any[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`mock-${key}`, JSON.stringify(data));
    }
  };

  const createMockQueryBuilder = (tableName: string): any => {
    const emptyResult = { data: null, error: null, count: 0 };

    const createBuilder = (currentFilters: Array<{ column: string; value: any }> = [], isSelectMode: boolean = false) => {
      const builder: any = {
        select: () => {
          // Return a new builder in select mode
          return createBuilder(currentFilters, true);
        },
        single: () => {
          let items = getMockData(tableName);
          // Apply all filters
          for (const filter of currentFilters) {
            items = items.filter((i: any) => i[filter.column] === filter.value);
          }
          return Promise.resolve({ data: items[0] || null, error: null });
        },
        insert: (data: any) => {
          const insertBuilder = createBuilder(currentFilters);
          insertBuilder.select = () => insertBuilder;
          insertBuilder.single = () => {
            const items = getMockData(tableName);
            const newItem = Array.isArray(data)
              ? { ...data[0], id: `mock-${Date.now()}`, created_at: new Date().toISOString() }
              : { ...data, id: `mock-${Date.now()}`, created_at: new Date().toISOString() };
            items.push(newItem);
            setMockData(tableName, items);
            return Promise.resolve({ data: newItem, error: null });
          };
          return insertBuilder;
        },
        update: (data: any) => {
          const updateFilters: Array<{ column: string; value: any }> = [];
          const createUpdateBuilder = (): any => {
            const updateBuilder: any = {
              eq: (column: string, value: any) => {
                updateFilters.push({ column, value });
                return createUpdateBuilder();
              },
              then: (resolve: any) => {
                const items = getMockData(tableName);
                // Find items matching all filters
                const matchingIndices: number[] = [];
                items.forEach((item: any, index: number) => {
                  const matches = updateFilters.every(f => item[f.column] === f.value);
                  if (matches) matchingIndices.push(index);
                });
                // Update matching items
                matchingIndices.forEach(idx => {
                  items[idx] = { ...items[idx], ...data, updated_at: new Date().toISOString() };
                });
                setMockData(tableName, items);
                return Promise.resolve({ data: null, error: null }).then(resolve);
              },
              catch: (reject: any) => Promise.resolve(emptyResult).catch(reject),
            };
            return updateBuilder;
          };
          return createUpdateBuilder();
        },
        delete: () => {
          const deleteFilters: Array<{ column: string; value: any }> = [];
          const createDeleteBuilder = (): any => {
            const deleteBuilder: any = {
              eq: (column: string, value: any) => {
                deleteFilters.push({ column, value });
                return createDeleteBuilder();
              },
              then: (resolve: any) => {
                const items = getMockData(tableName);
                // Filter out items matching ALL filters
                const filtered = items.filter((item: any) => {
                  const matches = deleteFilters.every(f => item[f.column] === f.value);
                  return !matches; // Keep items that don't match all filters
                });
                setMockData(tableName, filtered);
                return Promise.resolve({ data: null, error: null }).then(resolve);
              },
              catch: (reject: any) => Promise.resolve(emptyResult).catch(reject),
            };
            return deleteBuilder;
          };
          return createDeleteBuilder();
        },
        upsert: (data: any, options?: { onConflict?: string }) => {
          const items = getMockData(tableName);
          const conflictKey = options?.onConflict || 'id';
          const itemData = Array.isArray(data) ? data[0] : data;
          const existingIndex = items.findIndex((i: any) => i[conflictKey] === itemData[conflictKey]);
          
          if (existingIndex !== -1) {
            items[existingIndex] = { ...items[existingIndex], ...itemData, updated_at: new Date().toISOString() };
          } else {
            items.push({ ...itemData, created_at: new Date().toISOString() });
          }
          setMockData(tableName, items);
          return Promise.resolve({ data: itemData, error: null });
        },
        order: () => createBuilder(currentFilters, isSelectMode),
        limit: () => createBuilder(currentFilters, isSelectMode),
        eq: (column: string, value: any) => {
          // Preserve select mode when adding filters
          return createBuilder([...currentFilters, { column, value }], isSelectMode);
        },
        in: () => createBuilder(currentFilters, isSelectMode),
      };

      // Make it awaitable
      builder.then = (resolve: any) => {
        let items = getMockData(tableName);
        // Apply all filters
        for (const filter of currentFilters) {
          items = items.filter((i: any) => i[filter.column] === filter.value);
        }
        return Promise.resolve({ data: items, error: null }).then(resolve);
      };
      builder.catch = (reject: any) => Promise.resolve(emptyResult).catch(reject);

      return builder;
    };

    return createBuilder([]);
  };

  return {
    from: (tableName: string) => createMockQueryBuilder(tableName),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  } as any;
}
