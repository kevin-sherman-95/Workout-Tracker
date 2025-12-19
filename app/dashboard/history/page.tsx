import { createClient } from "@/lib/supabase/server";
import { WorkoutHistoryClient } from "@/components/workout-history-client";
import type { WorkoutWithExercises } from "@/lib/types";

async function getWorkouts() {
  const supabase = await createClient();
  
  try {
    const { data: workouts } = await supabase
      .from("workouts")
      .select(`
        *,
        workout_exercises (
          *,
          exercise:exercises (*)
        )
      `)
      .order("workout_date", { ascending: false });

    return workouts as WorkoutWithExercises[] | null;
  } catch (error) {
    // Supabase not configured, return empty for testing
    return null;
  }
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { workout?: string };
}) {
  const workouts = await getWorkouts();
  const selectedWorkoutId = searchParams?.workout;

  return (
    <WorkoutHistoryClient 
      serverWorkouts={workouts} 
      selectedWorkoutId={selectedWorkoutId}
    />
  );
}

