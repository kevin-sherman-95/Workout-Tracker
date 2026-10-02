import { NextResponse } from "next/server";
import { BODY_WEIGHT_UNIT } from "@/lib/body-weight";
import { getSupabaseWithUser } from "@/lib/supabase/server";
import { groupWorkoutExercisesInPerformOrder } from "@/lib/workout-exercise-order";
import type { WorkoutWithExercises } from "@/lib/types";
import {
  getConfiguredWorkoutApiUserId,
  isAuthorizedWorkoutApiRequest,
  isValidUuid,
  parseWorkoutListQuery,
} from "@/lib/workout-api-helpers";
import type {
  CatalogExercise,
  EncodedSetRow,
  WorkoutApiRepository,
  WorkoutWritePatch,
} from "@/lib/workout-api-write";
import {
  WORKOUT_API_SCHEMA_VERSION,
  WORKOUT_API_UNITS,
  decodeWorkoutSet,
  inferExerciseModality,
} from "@/lib/workout-set-decode";

export { WORKOUT_API_SCHEMA_VERSION, WORKOUT_API_UNITS };

export function workoutApiEnvelope<T extends Record<string, unknown>>(
  payload: T
) {
  return {
    schemaVersion: WORKOUT_API_SCHEMA_VERSION,
    units: WORKOUT_API_UNITS,
    ...payload,
  };
}

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
  to: string | null,
  date: string | null = null
): { from?: string; to?: string } | NextResponse {
  const parsed = parseWorkoutListQuery(from, to, date);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  return parsed;
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
    // Numeric `bodyWeight` kept for existing consumers; unit is always lb.
    bodyWeight: workout.body_weight ?? null,
    bodyWeightUnit: BODY_WEIGHT_UNIT,
    exercises: grouped.map((group) => {
      const modality = inferExerciseModality(
        group.exercise.name,
        workout.focus
      );
      return {
        id: group.exercise.id,
        name: group.exercise.name,
        muscleGroup: group.exercise.muscle_group?.name ?? null,
        modality,
        sets: group.sets.map((set) =>
          decodeWorkoutSet(
            {
              set_number: set.set_number,
              reps: set.reps,
              weight: Number(set.weight),
              rest_interval: set.rest_interval ?? null,
            },
            modality
          )
        ),
      };
    }),
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

function isInvalidUuidError(error: { code?: string; message?: string }): boolean {
  const text = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  return text.includes("22p02") || text.includes("invalid input syntax for type uuid");
}

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
    if (!isValidUuid(filters.id)) {
      return { workouts: [] };
    }
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
    if (filters.id && isInvalidUuidError(error)) {
      return { workouts: [] };
    }
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

type SupabaseLike = Awaited<ReturnType<typeof getSupabaseWithUser>>["supabase"];

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export function jsonFromApiResult<T extends Record<string, unknown>>(
  result:
    | { ok: true; status: number; data: T }
    | { ok: false; status: number; error: string }
) {
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(workoutApiEnvelope(result.data), {
    status: result.status,
  });
}

export function serializedWorkoutResponse(
  result:
    | { ok: true; status: number; data: WorkoutWithExercises }
    | { ok: false; status: number; error: string }
) {
  if (!result.ok) return jsonFromApiResult(result);
  return jsonFromApiResult({
    ok: true,
    status: result.status,
    data: { workout: serializeWorkout(result.data) },
  });
}

async function fetchWorkoutRow(
  supabase: SupabaseLike,
  id: string,
  userId: string
): Promise<WorkoutWithExercises | null | { error: string }> {
  if (!isValidUuid(id)) {
    return null;
  }

  const { data, error } = await supabase
    .from("workouts")
    .select(WORKOUT_API_SELECT)
    .eq("id", id)
    .eq("user_id", userId)
    .order("created_at", {
      ascending: true,
      referencedTable: "workout_exercises",
    })
    .order("set_number", {
      ascending: true,
      referencedTable: "workout_exercises",
    })
    .maybeSingle();

  if (error) {
    if (isInvalidUuidError(error)) {
      return null;
    }
    console.error("Workout API get failed:", error);
    return { error: error.message };
  }
  return (data as WorkoutWithExercises | null) ?? null;
}

export function createSupabaseWorkoutRepository(
  supabase: SupabaseLike
): WorkoutApiRepository {
  return {
    async listUserIds() {
      const { data, error } = await supabase.from("users").select("id");
      if (error) {
        console.error("Workout API users lookup failed:", error);
        return [];
      }
      return uniqueStrings((data ?? []).map((row: { id?: string }) => row.id));
    },

    async listWorkoutUserIds() {
      const { data, error } = await supabase.from("workouts").select("user_id");
      if (error) {
        console.error("Workout API workout users lookup failed:", error);
        return [];
      }
      return uniqueStrings(
        (data ?? []).map((row: { user_id?: string }) => row.user_id)
      );
    },

    async listCatalogExercises() {
      const { data, error } = await supabase
        .from("exercises")
        .select("id, name, muscle_group_id, muscle_group:muscle_groups ( id, name )")
        .order("name");
      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []) as CatalogExercise[];
    },

    async insertWorkout(row) {
      const { data, error } = await supabase
        .from("workouts")
        .insert(row)
        .select("id")
        .single();
      if (error || !data?.id) {
        return {
          error: error?.message ?? "Insert returned no id.",
          code: error?.code,
        };
      }
      return { id: data.id as string };
    },

    async updateWorkout(id, userId, patch: WorkoutWritePatch) {
      const { data, error } = await supabase
        .from("workouts")
        .update(patch)
        .eq("id", id)
        .eq("user_id", userId)
        .select("id");
      if (error) return { error: error.message };
      if (!data || data.length === 0) return "not_found";
      return "ok";
    },

    async replaceWorkoutExercises(workoutId, rows: EncodedSetRow[]) {
      const { error: deleteError } = await supabase
        .from("workout_exercises")
        .delete()
        .eq("workout_id", workoutId);
      if (deleteError) return { error: deleteError.message };

      if (rows.length === 0) return {};

      const insertBaseMs = Date.now();
      const { error } = await supabase.from("workout_exercises").insert(
        rows.map((row, idx) => ({
          workout_id: workoutId,
          exercise_id: row.exercise_id,
          set_number: row.set_number,
          reps: row.reps,
          weight: row.weight,
          rest_interval: row.rest_interval,
          created_at: new Date(insertBaseMs + idx).toISOString(),
        }))
      );
      if (error) return { error: error.message };
      return {};
    },

    async deleteWorkout(id, userId) {
      const { error: exerciseError } = await supabase
        .from("workout_exercises")
        .delete()
        .eq("workout_id", id);
      if (exerciseError) return { error: exerciseError.message };

      const { data, error } = await supabase
        .from("workouts")
        .delete()
        .eq("id", id)
        .eq("user_id", userId)
        .select("id");
      if (error) return { error: error.message };
      if (!data || data.length === 0) return "not_found";
      return "ok";
    },

    async getWorkout(id, userId) {
      return fetchWorkoutRow(supabase, id, userId);
    },

    async touchExerciseUsage(userId, exerciseIds) {
      if (exerciseIds.length === 0) return;
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("user_exercise_usage")
        .select("exercise_id, usage_count")
        .eq("user_id", userId)
        .in("exercise_id", exerciseIds);

      const current = new Map<string, number>(
        (data ?? []).map((row: { exercise_id: string; usage_count: number }) => [
          row.exercise_id,
          Number(row.usage_count) || 0,
        ])
      );

      await supabase.from("user_exercise_usage").upsert(
        exerciseIds.map((exerciseId) => ({
          user_id: userId,
          exercise_id: exerciseId,
          usage_count: (current.get(exerciseId) ?? 0) + 1,
          last_used_at: now,
        })),
        { onConflict: "user_id,exercise_id" }
      );
    },
  };
}

export async function getWorkoutApiRepository(): Promise<
  | { repo: WorkoutApiRepository }
  | { error: NextResponse }
> {
  const { supabase, isMockMode } = await getSupabaseWithUser();
  if (isMockMode) {
    return {
      error: NextResponse.json(
        { error: "Database not configured." },
        { status: 503 }
      ),
    };
  }
  return { repo: createSupabaseWorkoutRepository(supabase) };
}

export async function parseJsonBody(
  request: Request
): Promise<{ body: unknown } | NextResponse> {
  const text = await request.text();
  if (!text.trim()) {
    return NextResponse.json(
      { error: "Request body is required." },
      { status: 400 }
    );
  }
  try {
    return { body: JSON.parse(text) };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
}
