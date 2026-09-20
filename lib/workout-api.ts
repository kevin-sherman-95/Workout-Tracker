import { NextResponse } from "next/server";
import { getSupabaseWithUser } from "@/lib/supabase/server";
import { groupWorkoutExercisesInPerformOrder } from "@/lib/workout-exercise-order";
import type { WorkoutWithExercises } from "@/lib/types";
import {
  getConfiguredWorkoutApiUserId,
  isAuthorizedWorkoutApiRequest,
  isValidIsoDate,
} from "@/lib/workout-api-helpers";

export const WORKOUT_API_SELECT = `
  *,
  workout_exercises (
    *,
    exercise:exercises (
      *,
      muscle_group:muscle_groups ( id, name )
    )
  )
`;

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function authorizeWorkoutApi(request: Request): NextResponse | null {
  if (!isAuthorizedWorkoutApiRequest(request.headers)) {
    return unauthorized();
  }
  return null;
}

export function parseInclusiveDateRange(
  from: string | null,
  to: string | null
): { from?: string; to?: string } | NextResponse {
  if (from && !isValidIsoDate(from)) {
    return NextResponse.json(
      { error: "Invalid from date. Use YYYY-MM-DD." },
      { status: 400 }
    );
  }
  if (to && !isValidIsoDate(to)) {
    return NextResponse.json(
      { error: "Invalid to date. Use YYYY-MM-DD." },
      { status: 400 }
    );
  }
  if (from && to && from > to) {
    return NextResponse.json(
      { error: "from must be on or before to." },
      { status: 400 }
    );
  }
  return {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };
}

export function serializeWorkout(workout: WorkoutWithExercises) {
  const grouped = groupWorkoutExercisesInPerformOrder(
    workout.workout_exercises ?? []
  );

  return {
    id: workout.id,
    userId: workout.user_id,
    date: workout.workout_date,
    createdAt: workout.created_at,
    name: workout.focus,
    focus: workout.focus,
    notes: workout.notes ?? null,
    bodyWeight: workout.body_weight ?? null,
    exercises: grouped.map((group) => ({
      id: group.exercise.id,
      name: group.exercise.name,
      muscleGroup: group.exercise.muscle_group?.name ?? null,
      sets: group.sets.map((set) => ({
        setNumber: set.set_number,
        reps: set.reps,
        weight: Number(set.weight),
        restIntervalSeconds: set.rest_interval ?? null,
      })),
    })),
  };
}

type WorkoutQuery = {
  id?: string;
  from?: string;
  to?: string;
};

type WorkoutQueryResult =
  | { error: NextResponse; workouts?: undefined }
  | { error?: undefined; workouts: WorkoutWithExercises[] };

export async function queryWorkouts(
  filters: WorkoutQuery
): Promise<WorkoutQueryResult> {
  const { supabase, isMockMode } = await getSupabaseWithUser();

  if (isMockMode) {
    return {
      error: NextResponse.json(
        { error: "Database not configured." },
        { status: 503 }
      ),
    };
  }

  let query = supabase
    .from("workouts")
    .select(WORKOUT_API_SELECT)
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

  const scopedUserId = getConfiguredWorkoutApiUserId();
  if (scopedUserId) {
    query = query.eq("user_id", scopedUserId);
  }
  if (filters.id) {
    query = query.eq("id", filters.id);
  }
  if (filters.from) {
    query = query.gte("workout_date", filters.from);
  }
  if (filters.to) {
    query = query.lte("workout_date", filters.to);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Workout API query failed:", error);
    return {
      error: NextResponse.json(
        { error: "Failed to load workouts." },
        { status: 500 }
      ),
    };
  }

  return {
    workouts: (data ?? []) as WorkoutWithExercises[],
  };
}
