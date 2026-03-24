import { getSupabaseWithUser } from "@/lib/supabase/server";
import { ProgressPageClient } from "@/components/progress-page-client";
import type { WorkoutWithExercises } from "@/lib/types";

async function getWorkouts(): Promise<WorkoutWithExercises[] | null> {
  const { supabase, userId } = await getSupabaseWithUser();

  try {
    if (!userId) {
      return null;
    }

    const { data: workouts } = await supabase
      .from("workouts")
      .select(`
        *,
        workout_exercises (
          *,
          exercise:exercises (
            *,
            muscle_group:muscle_groups ( id, name )
          )
        )
      `)
      .eq("user_id", userId)
      .order("workout_date", { ascending: false });

    return workouts as WorkoutWithExercises[] | null;
  } catch {
    return null;
  }
}

export default async function ProgressPage() {
  const workouts = await getWorkouts();

  return <ProgressPageClient serverWorkouts={workouts} />;
}
