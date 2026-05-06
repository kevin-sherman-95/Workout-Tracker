import { getSupabaseWithUser } from "@/lib/supabase/server";
import { WorkoutHistoryClient } from "@/components/workout-history-client";
import type { WorkoutWithExercises } from "@/lib/types";
import type { WorkoutHistoryPeriod } from "@/lib/workout-date-periods";

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
      .order("workout_date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("created_at", {
        ascending: true,
        referencedTable: "workout_exercises",
      })
      .order("set_number", {
        ascending: true,
        referencedTable: "workout_exercises",
      });

    return workouts as WorkoutWithExercises[] | null;
  } catch (error) {
    // Supabase not configured, return empty for testing
    return null;
  }
}

function parseHistoryPeriod(
  value: string | undefined
): WorkoutHistoryPeriod | undefined {
  if (value === "week" || value === "month") return value;
  return undefined;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { workout?: string; exercise?: string; period?: string };
}) {
  const workouts = await getWorkouts();
  const selectedWorkoutId = searchParams?.workout;
  const highlightExerciseId = searchParams?.exercise;
  const historyPeriod = parseHistoryPeriod(searchParams?.period);

  return (
    <WorkoutHistoryClient
      serverWorkouts={workouts}
      selectedWorkoutId={selectedWorkoutId}
      highlightExerciseId={highlightExerciseId}
      historyPeriod={historyPeriod}
    />
  );
}

