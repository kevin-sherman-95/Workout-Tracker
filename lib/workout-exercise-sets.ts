import { sortWorkoutExerciseRows } from "@/lib/workout-exercise-order";

/** Form row shape shared by log/edit and "Repeat last [Focus]". */
export type FormExerciseSet = {
  exerciseId: string;
  sets: Array<{
    reps: number;
    weight: number;
    distance?: number;
    time?: number;
    pace?: number;
    swimSets?: number;
  }>;
  restInterval: string;
};

export type WorkoutExerciseSourceRow = {
  exercise_id: string;
  set_number?: number;
  reps: number;
  weight: number;
  rest_interval?: number | null;
  created_at?: string;
  id?: string;
  workout_id?: string;
  exercise_name?: string;
  exercise?: { id?: string; name?: string; muscle_group_id?: string } | null;
};

function exerciseNameOf(row: WorkoutExerciseSourceRow): string {
  return (
    row.exercise_name ??
    (row.exercise && typeof row.exercise === "object" && "name" in row.exercise
      ? row.exercise.name
      : undefined) ??
    ""
  ).trim();
}

/**
 * Convert persisted workout_exercises rows into form ExerciseSet groups.
 * `emptyReps` leaves reps/time blank (0) while keeping last working weights
 * / cardio distance-output as defaults — used by Repeat last [Focus].
 */
export function rowsToExerciseSets(
  workoutExercises: WorkoutExerciseSourceRow[],
  focus: string,
  options?: { emptyReps?: boolean }
): FormExerciseSet[] {
  const isCardioWorkout = focus === "Cardio";
  const emptyReps = options?.emptyReps === true;
  const sorted = sortWorkoutExerciseRows(
    workoutExercises.map((we, index) => ({
      id: we.id ?? `tmp-${we.exercise_id}-${index}`,
      workout_id: "",
      exercise_id: we.exercise_id,
      set_number: we.set_number ?? index + 1,
      reps: we.reps,
      weight: we.weight,
      rest_interval: we.rest_interval ?? undefined,
      created_at: we.created_at,
      exercise: {
        id: we.exercise_id,
        name: exerciseNameOf(we),
        muscle_group_id: "",
      },
    }))
  );

  const grouped = new Map<string, FormExerciseSet>();
  const order: string[] = [];

  for (const we of sorted) {
    const name = exerciseNameOf(we);
    const isCoreExercise = name === "Core";
    if (!grouped.has(we.exercise_id)) {
      order.push(we.exercise_id);
      grouped.set(we.exercise_id, {
        exerciseId: we.exercise_id,
        sets: [],
        restInterval: we.rest_interval?.toString() || "90",
      });
    }

    const group = grouped.get(we.exercise_id)!;
    if (isCardioWorkout) {
      if (name === "Swimming") {
        group.sets.push({
          reps: 0,
          weight: 0,
          distance: we.weight,
          time: emptyReps ? 0 : we.reps,
          swimSets: Math.max(1, we.rest_interval ?? 1),
        });
      } else {
        group.sets.push({
          reps: 0,
          weight: 0,
          distance: we.weight,
          time: emptyReps ? 0 : we.reps,
          ...(name === "Walking" ? { pace: we.rest_interval ?? 0 } : {}),
        });
      }
    } else if (isCoreExercise) {
      group.sets.push({
        reps: 0,
        weight: 0,
        distance: 0,
        time: emptyReps ? 0 : we.reps,
      });
    } else {
      group.sets.push({
        reps: emptyReps ? 0 : we.reps,
        weight: we.weight,
        distance: 0,
        time: 0,
      });
    }
  }

  return order.map((id) => grouped.get(id)!);
}
