"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Pencil, Trash2, X, Filter } from "lucide-react";
import type { WorkoutWithExercises, Exercise, WorkoutFocus } from "@/lib/types";

// Parse date string (YYYY-MM-DD) as local date to avoid timezone issues
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
};

interface WorkoutHistoryClientProps {
  serverWorkouts: WorkoutWithExercises[] | null;
  selectedWorkoutId?: string;
}

export function WorkoutHistoryClient({ serverWorkouts, selectedWorkoutId }: WorkoutHistoryClientProps) {
  const [workouts, setWorkouts] = useState<WorkoutWithExercises[] | null>(serverWorkouts);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [deletingWorkoutId, setDeletingWorkoutId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [focusFilter, setFocusFilter] = useState<string>("all");

  const loadWorkoutsFromLocalStorage = useCallback(async () => {
    // Load mock workouts from localStorage
    const mockWorkouts = typeof window !== 'undefined' 
      ? JSON.parse(localStorage.getItem('mock-workouts') || '[]')
      : [];
    
    // Load mock workout exercises from localStorage
    const mockWorkoutExercises = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('mock-workout-exercises') || '[]')
      : [];

    // Load exercises to get exercise names - first try localStorage for mock exercises
    let exerciseList: Exercise[] = [];
    
    // Load mock exercises from localStorage
    const mockExercises = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('mock-exercises') || '[]')
      : [];
    
    if (mockExercises.length > 0) {
      exerciseList = mockExercises;
      setExercises(mockExercises);
    }
    
    // Also try to load from Supabase in case some exercises are there
    const client = createClient();
    try {
      const { data: exerciseData } = await client
        .from("exercises")
        .select("*");
      
      if (exerciseData && exerciseData.length > 0) {
        // Merge with mock exercises, preferring database exercises
        const mergedExercises = [...exerciseList];
        exerciseData.forEach((dbExercise: Exercise) => {
          if (!mergedExercises.find(e => e.id === dbExercise.id)) {
            mergedExercises.push(dbExercise);
          }
        });
        exerciseList = mergedExercises;
        setExercises(mergedExercises);
      }
    } catch (error) {
      // If exercises can't be loaded from DB, we'll use localStorage data
    }

    // Get mock user ID
    const mockUser = typeof window !== 'undefined'
      ? JSON.parse(sessionStorage.getItem('mock-user') || 'null')
      : null;

    // Filter workouts by user
    const userWorkouts = mockUser 
      ? mockWorkouts.filter((w: any) => w.user_id === mockUser.id)
      : mockWorkouts;

    // Auto-migrate: Update any workout exercises that are missing exercise_name
    let needsMigration = false;
    const migratedWorkoutExercises = mockWorkoutExercises.map((we: any) => {
      if (!we.exercise_name && we.exercise_id) {
        const foundExercise = exerciseList.find((e) => e.id === we.exercise_id);
        if (foundExercise) {
          needsMigration = true;
          return { ...we, exercise_name: foundExercise.name };
        }
      }
      return we;
    });
    
    // Save migrated data back to localStorage
    if (needsMigration && typeof window !== 'undefined') {
      localStorage.setItem('mock-workout-exercises', JSON.stringify(migratedWorkoutExercises));
    }

    // Combine workouts with their exercises
    const workoutsWithExercises: WorkoutWithExercises[] = userWorkouts.map((workout: any) => {
      const workoutExercises = migratedWorkoutExercises
        .filter((we: any) => we.workout_id === workout.id)
        .map((we: any) => {
          // First check if exercise_name is stored directly on the workout exercise
          if (we.exercise_name) {
            return {
              ...we,
              exercise: { id: we.exercise_id, name: we.exercise_name, muscle_group_id: '' },
            };
          }
          
          // Fall back to looking up exercise by ID
          let exercise: Exercise;
          if (we.exercise_id.startsWith('mock-')) {
            // It's a mock exercise ID, try to find it in the exercise list
            exercise = exerciseList.find((e) => e.id === we.exercise_id) || 
                      { id: we.exercise_id, name: `Exercise ${we.exercise_id.slice(-6)}`, muscle_group_id: '' };
          } else {
            // Real exercise ID
            exercise = exerciseList.find((e) => e.id === we.exercise_id) || 
                      { id: we.exercise_id, name: we.exercise_id, muscle_group_id: '' };
          }
          return {
            ...we,
            exercise: exercise,
          };
        });

      return {
        ...workout,
        workout_exercises: workoutExercises,
      };
    });

    // Sort by date descending
    workoutsWithExercises.sort((a, b) => 
      parseLocalDate(b.workout_date).getTime() - parseLocalDate(a.workout_date).getTime()
    );

    setWorkouts(workoutsWithExercises);
  }, []);

  // Load data on mount and when serverWorkouts changes
  useEffect(() => {
    // If we have valid server data, use it
    if (serverWorkouts && serverWorkouts.length > 0) {
      setWorkouts(serverWorkouts);
      return;
    }

    // Otherwise, always try to load from localStorage as fallback
    // This handles both mock mode AND cases where server data is unavailable
    if (typeof window !== 'undefined') {
      loadWorkoutsFromLocalStorage();
    }
  }, [serverWorkouts, loadWorkoutsFromLocalStorage]);

  // Listen for workout updates to refresh the list
  useEffect(() => {
    const handleWorkoutUpdate = () => {
      if (typeof window !== 'undefined') {
        loadWorkoutsFromLocalStorage();
      }
    };

    // Listen for custom event (same-tab updates)
    window.addEventListener('workoutUpdated', handleWorkoutUpdate);
    // Listen for storage events (cross-tab updates)
    window.addEventListener('storage', handleWorkoutUpdate);

    return () => {
      window.removeEventListener('workoutUpdated', handleWorkoutUpdate);
      window.removeEventListener('storage', handleWorkoutUpdate);
    };
  }, [loadWorkoutsFromLocalStorage]);

  // Delete a workout
  const handleDeleteWorkout = async (workoutId: string) => {
    setIsDeleting(true);
    
    try {
      const client = createClient();
      
      // Check if we're in mock mode
      const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
      
      if (isMockMode) {
        // Delete from localStorage
        const mockWorkouts = JSON.parse(localStorage.getItem('mock-workouts') || '[]');
        const filteredWorkouts = mockWorkouts.filter((w: any) => w.id !== workoutId);
        localStorage.setItem('mock-workouts', JSON.stringify(filteredWorkouts));
        
        // Also delete associated workout exercises
        const mockWorkoutExercises = JSON.parse(localStorage.getItem('mock-workout-exercises') || '[]');
        const filteredExercises = mockWorkoutExercises.filter((we: any) => we.workout_id !== workoutId);
        localStorage.setItem('mock-workout-exercises', JSON.stringify(filteredExercises));
      } else {
        // Delete from Supabase - first delete workout exercises, then the workout
        await client
          .from("workout_exercises")
          .delete()
          .eq("workout_id", workoutId);
        
        await client
          .from("workouts")
          .delete()
          .eq("id", workoutId);
      }
      
      // Update local state - this is sufficient for the UI update
      // Don't dispatch workoutUpdated event as it would trigger loadWorkoutsFromLocalStorage
      // which overwrites state with empty localStorage data when using Supabase
      setWorkouts(prev => prev?.filter(w => w.id !== workoutId) || null);
    } catch (error) {
      console.error('Failed to delete workout:', error);
    } finally {
      setIsDeleting(false);
      setDeletingWorkoutId(null);
    }
  };

  // Get all available workout focuses (predefined types)
  const allWorkoutFocuses: WorkoutFocus[] = [
    "Chest / Shoulders / Triceps",
    "Back/Biceps",
    "Legs",
    "Full Body",
    "Cardio",
    "Other"
  ];

  // Filter by selected workout if provided, then by focus filter
  let displayedWorkouts = selectedWorkoutId
    ? workouts?.filter((w) => w.id === selectedWorkoutId) || []
    : workouts || [];
  
  // Apply focus filter if not "all"
  if (focusFilter !== "all") {
    displayedWorkouts = displayedWorkouts.filter((w) => w.focus === focusFilter);
  }

  // Calculate stats for filtered workouts
  const getWorkoutStats = () => {
    if (!workouts) return null;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const filteredWorkouts = focusFilter === "all" 
      ? workouts 
      : workouts.filter((w) => w.focus === focusFilter);
    
    const thisMonthCount = filteredWorkouts.filter((w) => {
      const workoutDate = parseLocalDate(w.workout_date);
      return workoutDate.getMonth() === currentMonth && workoutDate.getFullYear() === currentYear;
    }).length;

    const thisYearCount = filteredWorkouts.filter((w) => {
      const workoutDate = parseLocalDate(w.workout_date);
      return workoutDate.getFullYear() === currentYear;
    }).length;

    return { thisMonthCount, thisYearCount };
  };

  const workoutStats = getWorkoutStats();

  if (!workouts || workouts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Workout History</h1>
          <p className="text-muted-foreground mt-2">
            View all your past workouts
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No workouts yet. Start logging your workouts to see them here!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedWorkoutId && displayedWorkouts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Workout History</h1>
          <p className="text-muted-foreground mt-2">
            View all your past workouts
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Workout not found.
            </p>
            <a href="/dashboard/history">
              <button className="text-primary hover:underline">View all workouts</button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workout History</h1>
        <p className="text-muted-foreground mt-2">
          View all your past workouts
        </p>
      </div>

      {selectedWorkoutId && (
        <div className="mb-4">
          <a href="/dashboard/history" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to all workouts
          </a>
        </div>
      )}

      {!selectedWorkoutId && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>Filter:</span>
            </div>
            <div className="w-[250px]">
              <Select 
                value={focusFilter} 
                onChange={(e) => setFocusFilter(e.target.value)}
              >
                <option value="all">All workouts</option>
                {allWorkoutFocuses.map((focus) => (
                  <option key={focus} value={focus}>
                    {focus}
                  </option>
                ))}
              </Select>
            </div>
            {focusFilter !== "all" && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setFocusFilter("all")}
                className="text-sm"
              >
                Clear filter
              </Button>
            )}
          </div>

          {workoutStats && (
            <Card className="bg-muted/50 border-muted inline-block">
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">This month:</span>
                    <span className="font-semibold text-foreground">{workoutStats.thisMonthCount} {workoutStats.thisMonthCount === 1 ? 'workout' : 'workouts'}</span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">This year:</span>
                    <span className="font-semibold text-foreground">{workoutStats.thisYearCount} {workoutStats.thisYearCount === 1 ? 'workout' : 'workouts'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {displayedWorkouts.length === 0 && focusFilter !== "all" && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No workouts found for &quot;{focusFilter}&quot;
            </p>
            <Button 
              variant="outline" 
              onClick={() => setFocusFilter("all")}
            >
              Show all workouts
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {displayedWorkouts.map((workout) => {
          const exercisesByExerciseId = workout.workout_exercises.reduce(
            (acc, we) => {
              if (!we.exercise) return acc;
              const exerciseId = we.exercise.id;
              if (!acc[exerciseId]) {
                acc[exerciseId] = {
                  exercise: we.exercise,
                  sets: [],
                };
              }
              acc[exerciseId].sets.push({
                set_number: we.set_number,
                reps: we.reps,
                weight: we.weight,
              });
              return acc;
            },
            {} as Record<
              string,
              {
                exercise: { id: string; name: string };
                sets: Array<{ set_number: number; reps: number; weight: number }>;
              }
            >
          );

          const isConfirmingDelete = deletingWorkoutId === workout.id;
          
          return (
            <Card key={workout.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Link href={`/dashboard/log/edit/${workout.id}`} className="group">
                    <CardTitle className="group-hover:text-primary transition-colors cursor-pointer">
                      {workout.focus}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 group-hover:text-muted-foreground/80">
                      {format(parseLocalDate(workout.workout_date), "EEEE, MMMM d, yyyy")}
                    </p>
                  </Link>
                  <div className="flex items-center gap-2">
                    {isConfirmingDelete ? (
                      <>
                        <span className="text-sm text-muted-foreground mr-2">Delete?</span>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteWorkout(workout.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? "Deleting..." : "Yes"}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setDeletingWorkoutId(null)}
                          disabled={isDeleting}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Link href={`/dashboard/log/edit/${workout.id}`}>
                          <Button variant="outline" size="sm">
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setDeletingWorkoutId(workout.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.values(exercisesByExerciseId).map(({ exercise, sets }) => (
                  <div key={exercise.id} className="border-l-2 border-primary pl-4">
                    <h4 className="font-semibold mb-2">{exercise.name}</h4>
                    <div className="space-y-1">
                      {sets
                        .sort((a, b) => a.set_number - b.set_number)
                        .map((set) => (
                          <div
                            key={set.set_number}
                            className="text-sm text-muted-foreground"
                          >
                            Set {set.set_number}: {set.reps} reps × {set.weight} lbs
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
                {workout.notes && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Notes:</span> {workout.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
