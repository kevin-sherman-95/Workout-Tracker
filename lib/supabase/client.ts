import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase browser client for client-side database operations.
 * Note: Authentication is handled by Auth0, not Supabase.
 * This client is used for client-side database queries only.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Return a mock client if credentials are missing (for testing)
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
    return createMockClient();
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
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
    let filterColumn: string | null = null;
    let filterValue: any = null;

    const createBuilder = () => {
      const builder: any = {
        select: () => {
          const selectBuilder = createBuilder();
          selectBuilder.single = () => {
            const items = getMockData(tableName);
            if (filterColumn && filterValue !== null) {
              const item = items.find((i: any) => i[filterColumn!] === filterValue);
              return Promise.resolve({ data: item || null, error: null });
            }
            return Promise.resolve({ data: items[0] || null, error: null });
          };
          return selectBuilder;
        },
        insert: (data: any) => {
          const insertBuilder = createBuilder();
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
          const updateBuilder = createBuilder();
          updateBuilder.eq = (column: string, value: any) => {
            const items = getMockData(tableName);
            const index = items.findIndex((i: any) => i[column] === value);
            if (index !== -1) {
              items[index] = { ...items[index], ...data, updated_at: new Date().toISOString() };
              setMockData(tableName, items);
              return Promise.resolve({ data: items[index], error: null });
            }
            return Promise.resolve({ data: null, error: null });
          };
          return updateBuilder;
        },
        delete: () => {
          const deleteBuilder = createBuilder();
          deleteBuilder.eq = (column: string, value: any) => {
            const items = getMockData(tableName);
            const filtered = items.filter((i: any) => i[column] !== value);
            setMockData(tableName, filtered);
            return Promise.resolve({ data: null, error: null });
          };
          return deleteBuilder;
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
        order: () => createBuilder(),
        limit: () => createBuilder(),
        eq: (column: string, value: any) => {
          filterColumn = column;
          filterValue = value;
          return createBuilder();
        },
        in: () => createBuilder(),
      };

      // Make it awaitable
      builder.then = (resolve: any) => {
        let items = getMockData(tableName);
        if (filterColumn && filterValue !== null) {
          items = items.filter((i: any) => i[filterColumn!] === filterValue);
        }
        return Promise.resolve({ data: items, error: null }).then(resolve);
      };
      builder.catch = (reject: any) => Promise.resolve(emptyResult).catch(reject);

      return builder;
    };

    return createBuilder();
  };

  return {
    from: (tableName: string) => createMockQueryBuilder(tableName),
  } as any;
}
