"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Pencil } from "lucide-react";
import type { WorkoutWithExercises, Exercise } from "@/lib/types";

interface WorkoutHistoryClientProps {
  serverWorkouts: WorkoutWithExercises[] | null;
  selectedWorkoutId?: string;
}

export function WorkoutHistoryClient({ serverWorkouts, selectedWorkoutId }: WorkoutHistoryClientProps) {
  const [workouts, setWorkouts] = useState<WorkoutWithExercises[] | null>(serverWorkouts);
  const [exercises, setExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    const loadMockData = async () => {
      const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
      
      if (!isMockMode) {
        // Use server data if not in mock mode
        setWorkouts(serverWorkouts);
        return;
      }

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
        new Date(b.workout_date).getTime() - new Date(a.workout_date).getTime()
      );

      setWorkouts(workoutsWithExercises);
    };

    loadMockData();
  }, [serverWorkouts]);

  // Filter by selected workout if provided
  const displayedWorkouts = selectedWorkoutId
    ? workouts?.filter((w) => w.id === selectedWorkoutId) || []
    : workouts || [];

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

          return (
            <Card key={workout.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Link href={`/dashboard/log/edit/${workout.id}`} className="group">
                    <CardTitle className="group-hover:text-primary transition-colors cursor-pointer">
                      {workout.focus}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 group-hover:text-muted-foreground/80">
                      {format(new Date(workout.workout_date), "EEEE, MMMM d, yyyy")}
                    </p>
                  </Link>
                  <Link href={`/dashboard/log/edit/${workout.id}`}>
                    <Button variant="outline" size="sm">
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
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
