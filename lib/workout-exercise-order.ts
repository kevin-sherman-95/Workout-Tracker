import type { Exercise, WorkoutExercise } from "@/lib/types";

export type WorkoutExerciseRow = WorkoutExercise & {
  exercise?: Exercise;
  created_at?: string;
};

export function getWorkoutExerciseRowSortKey(row: WorkoutExerciseRow): number {
  if (row.created_at) {
    const ms = Date.parse(row.created_at);
    if (!Number.isNaN(ms)) return ms;
  }
  const mock = row.id.match(/^mock-we-(\d+)-(\d+)$/);
  if (mock) {
    return Number(mock[1]) * 1_000_000 + Number(mock[2]);
  }
  return 0;
}

export function compareWorkoutExerciseRows(
  a: WorkoutExerciseRow,
  b: WorkoutExerciseRow
): number {
  const diff = getWorkoutExerciseRowSortKey(a) - getWorkoutExerciseRowSortKey(b);
  if (diff !== 0) return diff;
  return a.set_number - b.set_number;
}

export function sortWorkoutExerciseRows<T extends WorkoutExerciseRow>(
  rows: T[]
): T[] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const cmp = compareWorkoutExerciseRows(a.row, b.row);
      if (cmp !== 0) return cmp;
      return a.index - b.index;
    })
    .map(({ row }) => row);
}

export interface GroupedWorkoutExercise {
  exercise: Exercise;
  sets: Array<{
    set_number: number;
    reps: number;
    weight: number;
    rest_interval?: number;
  }>;
}

export function groupWorkoutExercisesInPerformOrder(
  rows: WorkoutExerciseRow[]
): GroupedWorkoutExercise[] {
  const sorted = sortWorkoutExerciseRows(rows);
  const byId = new Map<string, GroupedWorkoutExercise>();
  const order: string[] = [];

  for (const we of sorted) {
    if (!we.exercise) continue;
    const exerciseId = we.exercise.id;
    if (!byId.has(exerciseId)) {
      order.push(exerciseId);
      byId.set(exerciseId, {
        exercise: we.exercise,
        sets: [],
      });
    }
    byId.get(exerciseId)!.sets.push({
      set_number: we.set_number,
      reps: we.reps,
      weight: we.weight,
      rest_interval: we.rest_interval,
    });
  }

  return order.map((id) => byId.get(id)!);
}
