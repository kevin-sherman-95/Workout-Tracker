import { getSupabaseWithUser } from "@/lib/supabase/server";
import { WorkoutHistoryClient } from "@/components/workout-history-client";
import type { WorkoutWithExercises } from "@/lib/types";

async function getWorkouts() {
  const { supabase, userId } = await getSupabaseWithUser();
  
  try {
    // Only fetch workouts if we have a valid user
    if (!userId) {
      return null;
    }
    
    const { data: workouts } = await supabase
      .from("workouts")
      .select(`
        *,
        workout_exercises (
          *,
          exercise:exercises (*)
        )
      `)
      .eq("user_id", userId)
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

