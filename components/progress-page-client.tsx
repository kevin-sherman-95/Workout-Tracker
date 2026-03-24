"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExerciseProgressChart } from "@/components/exercise-progress-chart";
import { format } from "date-fns";
import type { WorkoutWithExercises, Exercise } from "@/lib/types";

function calculateVolume(workout: WorkoutWithExercises): number {
  return workout.workout_exercises.reduce((total, we) => {
    return total + we.reps * we.weight;
  }, 0);
}

function getPersonalRecords(workouts: WorkoutWithExercises[]) {
  const prs: Record<
    string,
    { exercise: string; reps: number; weight: number; date: string }
  > = {};

  workouts.forEach((workout) => {
    workout.workout_exercises.forEach((we) => {
      if (!we.exercise) return;
      const exerciseName = we.exercise.name;
      const key = `${exerciseName}-${we.reps}`;

      if (!prs[key] || we.weight > prs[key].weight) {
        prs[key] = {
          exercise: exerciseName,
          reps: we.reps,
          weight: we.weight,
          date: workout.workout_date,
        };
      }
    });
  });

  return Object.values(prs).sort((a, b) => b.weight - a.weight).slice(0, 10);
}

function loadWorkoutsFromLocalStorage(): WorkoutWithExercises[] {
  if (typeof window === "undefined") return [];

  const mockWorkouts = JSON.parse(localStorage.getItem("mock-workouts") || "[]");
  const mockWorkoutExercises = JSON.parse(
    localStorage.getItem("mock-workout-exercises") || "[]"
  );
  const mockExercises = JSON.parse(
    localStorage.getItem("mock-exercises") || "[]"
  );

  const exerciseList: Exercise[] = mockExercises;
  const mockUser = JSON.parse(sessionStorage.getItem("mock-user") || "null");

  const userWorkouts = mockUser
    ? mockWorkouts.filter((w: { user_id?: string }) => w.user_id === mockUser.id)
    : mockWorkouts;

  const workoutsWithExercises: WorkoutWithExercises[] = userWorkouts.map(
    (workout: {
      id: string;
      workout_date: string;
      focus: string;
      notes?: string;
      created_at: string;
      user_id?: string;
    }) => {
      const workoutExercises = mockWorkoutExercises
        .filter((we: { workout_id: string }) => we.workout_id === workout.id)
        .map((we: any) => {
          const exercise = we.exercise_name
            ? { id: we.exercise_id, name: we.exercise_name, muscle_group_id: "" }
            : exerciseList.find((e) => e.id === we.exercise_id) || {
                id: we.exercise_id,
                name: we.exercise_id.startsWith("mock-")
                  ? `Exercise ${we.exercise_id.slice(-6)}`
                  : we.exercise_id,
                muscle_group_id: "",
              };
          return { ...we, exercise };
        });

      return {
        ...workout,
        workout_exercises: workoutExercises,
      };
    }
  );

  workoutsWithExercises.sort(
    (a, b) =>
      new Date(b.workout_date).getTime() - new Date(a.workout_date).getTime()
  );
  return workoutsWithExercises;
}

interface ProgressPageClientProps {
  serverWorkouts: WorkoutWithExercises[] | null;
}

export function ProgressPageClient({ serverWorkouts }: ProgressPageClientProps) {
  const [workouts, setWorkouts] = useState<WorkoutWithExercises[] | null>(
    serverWorkouts
  );

  const loadFromStorage = useCallback(() => {
    const fromStorage = loadWorkoutsFromLocalStorage();
    setWorkouts(fromStorage.length > 0 ? fromStorage : null);
  }, []);

  useEffect(() => {
    if (serverWorkouts && serverWorkouts.length > 0) {
      setWorkouts(serverWorkouts);
      return;
    }
    loadFromStorage();
  }, [serverWorkouts, loadFromStorage]);

  useEffect(() => {
    const handleUpdate = () => loadFromStorage();
    window.addEventListener("workoutUpdated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("workoutUpdated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [loadFromStorage]);

  if (!workouts || workouts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Progress</h1>
          <p className="text-muted-foreground mt-2">
            Track your exercise progress over time
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No workouts yet. Start logging your workouts to see your progress!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedWorkouts = [...workouts].reverse();
  const personalRecords = getPersonalRecords(workouts);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Progress</h1>
        <p className="text-muted-foreground mt-2">
          Track your exercise progress over time
        </p>
      </div>

      <ExerciseProgressChart workouts={sortedWorkouts} />

      <Card>
        <CardHeader>
          <CardTitle>Recent Workouts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workouts.slice(0, 10).map((workout) => {
              const volume = calculateVolume(workout);
              const exerciseGroups = workout.workout_exercises.reduce(
                (acc, we) => {
                  if (!we.exercise) return acc;
                  const name = we.exercise.name;
                  if (!acc[name]) {
                    acc[name] = [];
                  }
                  acc[name].push(we);
                  return acc;
                },
                {} as Record<string, typeof workout.workout_exercises>
              );

              return (
                <div
                  key={workout.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {format(
                          new Date(workout.workout_date),
                          "EEEE, MMMM d, yyyy"
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {workout.focus}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Total Volume
                      </p>
                      <p className="text-lg font-bold">
                        {volume.toLocaleString()} lbs
                      </p>
                    </div>
                  </div>

                  {workout.notes && (
                    <p className="text-sm text-muted-foreground italic">
                      {workout.notes}
                    </p>
                  )}

                  <div className="space-y-2">
                    {Object.entries(exerciseGroups).map(
                      ([exerciseName, sets]) => {
                        const maxWeight = Math.max(
                          ...sets.map((s) => s.weight)
                        );
                        const totalReps = sets.reduce(
                          (sum, s) => sum + s.reps,
                          0
                        );
                        const totalVolume = sets.reduce(
                          (sum, s) => sum + s.reps * s.weight,
                          0
                        );

                        return (
                          <div
                            key={exerciseName}
                            className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded"
                          >
                            <div className="flex-1">
                              <p className="font-medium">{exerciseName}</p>
                              <p className="text-xs text-muted-foreground">
                                {sets.length} set
                                {sets.length !== 1 ? "s" : ""} • {totalReps}{" "}
                                reps
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                Max: {maxWeight} lbs
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Volume:{" "}
                                {totalVolume.toLocaleString()} lbs
                              </p>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {personalRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Personal Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {personalRecords.map((pr, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium">
                      {pr.exercise} - {pr.reps} reps
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(pr.date), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="text-lg font-bold">{pr.weight} lbs</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
