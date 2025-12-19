import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // BYPASS AUTH FOR TESTING - Return a mock client if credentials are missing
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
    // Return a mock client that won't throw errors
    const createMockQueryBuilder = (tableName: string): any => {
      const emptyResult = { data: null, error: null, count: 0 };
      
      // Create a base builder object
      const createBuilder = (tableName: string) => {
        const builder: any = {
          select: (cols?: string | { count?: string; head?: boolean }) => {
            if (cols && typeof cols === 'object' && cols.count) {
              return Promise.resolve(emptyResult);
            }
            const selectBuilder = createBuilder(tableName);
            selectBuilder.single = () => {
              if (tableName === 'workouts') {
                const workouts = getMockWorkouts();
                const latest = workouts[workouts.length - 1];
                return Promise.resolve({ 
                  data: latest || { id: `mock-${Date.now()}`, created_at: new Date().toISOString() }, 
                  error: null 
                });
              }
              const singleResult = { 
                data: { id: `mock-${Date.now()}`, created_at: new Date().toISOString() }, 
                error: null 
              };
              return Promise.resolve(singleResult);
            };
            // Handle select queries
            if (tableName === 'workouts') {
              const workouts = getMockWorkouts();
              const mockUser = getMockUser();
              const userWorkouts = mockUser ? workouts.filter((w: any) => w.user_id === mockUser.id) : workouts;
              return Promise.resolve({ data: userWorkouts, error: null });
            } else if (tableName === 'workout_exercises') {
              const exercises = getMockWorkoutExercises();
              return Promise.resolve({ data: exercises, error: null });
            } else if (tableName === 'exercises') {
              const exercises = getMockExercises();
              return Promise.resolve({ data: exercises, error: null });
            }
            return Promise.resolve(emptyResult);
          },
          insert: (data: any) => {
            const insertBuilder = createBuilder(tableName);
            insertBuilder.select = () => insertBuilder;
            insertBuilder.single = () => {
              if (tableName === 'workouts') {
                const workouts = getMockWorkouts();
                const newWorkout = Array.isArray(data) 
                  ? { ...data[0], id: `mock-${Date.now()}`, created_at: new Date().toISOString() }
                  : { ...data, id: `mock-${Date.now()}`, created_at: new Date().toISOString() };
                workouts.push(newWorkout);
                setMockWorkouts(workouts);
                return Promise.resolve({ data: newWorkout, error: null });
              } else if (tableName === 'workout_exercises') {
                const exercises = getMockWorkoutExercises();
                const newExercises = Array.isArray(data) 
                  ? data.map((item, idx) => ({ ...item, id: `mock-ex-${Date.now()}-${idx}`, created_at: new Date().toISOString() }))
                  : [{ ...data, id: `mock-ex-${Date.now()}`, created_at: new Date().toISOString() }];
                exercises.push(...newExercises);
                setMockWorkoutExercises(exercises);
                return Promise.resolve({ data: Array.isArray(data) ? newExercises : newExercises[0], error: null });
              } else if (tableName === 'exercises') {
                const exercises = getMockExercises();
                const newExercises = Array.isArray(data) 
                  ? data.map((item, idx) => ({ ...item, id: item.id || `mock-exercise-${Date.now()}-${idx}`, created_at: new Date().toISOString() }))
                  : [{ ...data, id: data.id || `mock-exercise-${Date.now()}`, created_at: new Date().toISOString() }];
                // Merge with existing exercises (avoid duplicates by ID)
                const existingIds = new Set(exercises.map((e: any) => e.id));
                const uniqueNew = newExercises.filter((e: any) => !existingIds.has(e.id));
                exercises.push(...uniqueNew);
                setMockExercises(exercises);
                return Promise.resolve({ data: Array.isArray(data) ? newExercises : newExercises[0], error: null });
              }
              const singleResult = { 
                data: Array.isArray(data) 
                  ? data.map((item, idx) => ({ ...item, id: `mock-${Date.now()}-${idx}` })) 
                  : { ...data, id: `mock-${Date.now()}` }, 
                error: null 
              };
              return Promise.resolve(singleResult);
            };
            // Handle bulk inserts (no .single())
            if (tableName === 'workout_exercises' && Array.isArray(data)) {
              const exercises = getMockWorkoutExercises();
              const newExercises = data.map((item, idx) => ({ 
                ...item, 
                id: `mock-ex-${Date.now()}-${idx}`, 
                created_at: new Date().toISOString() 
              }));
              exercises.push(...newExercises);
              setMockWorkoutExercises(exercises);
              return Promise.resolve({ data: newExercises, error: null });
            }
            return insertBuilder;
          },
          update: (data: any) => {
            const updateBuilder: any = createBuilder(tableName);
            updateBuilder.eq = (column: string, value: any) => {
              const updatePromise = (async () => {
                if (tableName === 'workouts') {
                  const workouts = getMockWorkouts();
                  const index = workouts.findIndex((w: any) => w[column] === value);
                  if (index !== -1) {
                    workouts[index] = { ...workouts[index], ...data, updated_at: new Date().toISOString() };
                    setMockWorkouts(workouts);
                    return { data: workouts[index], error: null };
                  }
                  return { data: null, error: null };
                } else if (tableName === 'workout_exercises') {
                  const exercises = getMockWorkoutExercises();
                  const filtered = exercises.filter((e: any) => e[column] === value);
                  filtered.forEach((e: any) => {
                    Object.assign(e, data);
                  });
                  setMockWorkoutExercises(exercises);
                  return { data: filtered, error: null };
                }
                return { data: null, error: null };
              })();
              updatePromise.then = (resolve: any) => updatePromise.then(resolve);
              updatePromise.catch = (reject: any) => updatePromise.catch(reject);
              return updatePromise;
            };
            return updateBuilder;
          },
          delete: () => {
            const deleteBuilder: any = createBuilder(tableName);
            deleteBuilder.eq = (column: string, value: any) => {
              const deletePromise = (async () => {
                if (tableName === 'workouts') {
                  const workouts = getMockWorkouts();
                  const filtered = workouts.filter((w: any) => w[column] !== value);
                  setMockWorkouts(filtered);
                  return { data: null, error: null };
                } else if (tableName === 'workout_exercises') {
                  const exercises = getMockWorkoutExercises();
                  const filtered = exercises.filter((e: any) => e[column] !== value);
                  setMockWorkoutExercises(filtered);
                  return { data: null, error: null };
                }
                return { data: null, error: null };
              })();
              deletePromise.then = (resolve: any) => deletePromise.then(resolve);
              deletePromise.catch = (reject: any) => deletePromise.catch(reject);
              return deletePromise;
            };
            return deleteBuilder;
          },
          order: () => createBuilder(tableName),
          limit: () => createBuilder(tableName),
          eq: () => createBuilder(tableName),
          in: () => createBuilder(tableName),
        };
        
        // Make it awaitable
        builder.then = (resolve: any) => {
          if (tableName === 'workouts') {
            const workouts = getMockWorkouts();
            const mockUser = getMockUser();
            const userWorkouts = mockUser ? workouts.filter((w: any) => w.user_id === mockUser.id) : workouts;
            return Promise.resolve({ data: userWorkouts, error: null }).then(resolve);
          } else if (tableName === 'workout_exercises') {
            const exercises = getMockWorkoutExercises();
            return Promise.resolve({ data: exercises, error: null }).then(resolve);
          } else if (tableName === 'exercises') {
            const exercises = getMockExercises();
            return Promise.resolve({ data: exercises, error: null }).then(resolve);
          }
          return Promise.resolve(emptyResult).then(resolve);
        };
        builder.catch = (reject: any) => Promise.resolve(emptyResult).catch(reject);
        
        return builder;
      };
      
      return createBuilder(tableName);
    };
    
    // Store mock user in sessionStorage for persistence
    const getMockUser = () => {
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('mock-user');
        if (stored) {
          return JSON.parse(stored);
        }
      }
      return null;
    };

    const setMockUser = (user: any) => {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('mock-user', JSON.stringify(user));
      }
    };

    const clearMockUser = () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('mock-user');
      }
    };

    // Store mock workouts in localStorage for persistence
    const getMockWorkouts = () => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('mock-workouts');
        if (stored) {
          return JSON.parse(stored);
        }
      }
      return [];
    };

    const setMockWorkouts = (workouts: any[]) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('mock-workouts', JSON.stringify(workouts));
      }
    };

    const getMockWorkoutExercises = () => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('mock-workout-exercises');
        if (stored) {
          return JSON.parse(stored);
        }
      }
      return [];
    };

    const setMockWorkoutExercises = (exercises: any[]) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('mock-workout-exercises', JSON.stringify(exercises));
      }
    };

    const getMockExercises = () => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('mock-exercises');
        if (stored) {
          return JSON.parse(stored);
        }
      }
      return [];
    };

    const setMockExercises = (exercises: any[]) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('mock-exercises', JSON.stringify(exercises));
      }
    };

    // Migrate orphaned workouts (from old timestamp-based user IDs) to the current user
    const migrateOrphanedWorkouts = (currentUserId: string) => {
      if (typeof window === 'undefined') return;
      
      const workouts = getMockWorkouts();
      let migrated = false;
      
      workouts.forEach((workout: any) => {
        // Check if this workout has an old-style timestamp ID (like "mock-1702903458293")
        // and is not already assigned to a consistent user ID (like "mock-user-email")
        if (workout.user_id && 
            workout.user_id.startsWith('mock-') && 
            !workout.user_id.startsWith('mock-user-') &&
            workout.user_id !== currentUserId) {
          workout.user_id = currentUserId;
          migrated = true;
        }
      });
      
      if (migrated) {
        setMockWorkouts(workouts);
        console.log('Migrated orphaned workouts to current user');
      }
    };

    return {
      auth: {
        getUser: async () => {
          const mockUser = getMockUser();
          return { data: { user: mockUser }, error: null };
        },
        signUp: async (credentials: any) => {
          // For testing: create a mock user with consistent ID based on email
          // This ensures the same email always gets the same user ID, preserving workouts
          const email = credentials?.email || 'test@example.com';
          const consistentId = `mock-user-${email.replace(/[^a-zA-Z0-9]/g, '-')}`;
          const mockUser = {
            id: consistentId,
            email: email,
            created_at: new Date().toISOString(),
          };
          setMockUser(mockUser);
          // Migrate any orphaned workouts from previous sessions
          migrateOrphanedWorkouts(consistentId);
          return { 
            data: { user: mockUser, session: null }, 
            error: null 
          };
        },
        signInWithPassword: async (credentials: any) => {
          // For testing: create a mock user with consistent ID based on email
          // This ensures the same email always gets the same user ID, preserving workouts
          const email = credentials?.email || 'test@example.com';
          const consistentId = `mock-user-${email.replace(/[^a-zA-Z0-9]/g, '-')}`;
          const mockUser = {
            id: consistentId,
            email: email,
            created_at: new Date().toISOString(),
          };
          setMockUser(mockUser);
          // Migrate any orphaned workouts from previous sessions
          migrateOrphanedWorkouts(consistentId);
          return { 
            data: { user: mockUser, session: null }, 
            error: null 
          };
        },
        signOut: async () => {
          clearMockUser();
          return { error: null };
        },
      },
      from: (tableName: string) => createMockQueryBuilder(tableName),
    } as any
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}

