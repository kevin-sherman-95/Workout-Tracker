/**
 * Decode-only view of workout_exercises rows.
 *
 * Cardio timings stay stored as `reps` (seconds) and distance/output/incline
 * as `weight`. This module never changes persistence — it only labels modality
 * and adds parallel decoded fields for API consumers.
 */

export const WORKOUT_API_SCHEMA_VERSION = 2;

export const WORKOUT_API_UNITS = {
  bodyWeight: "lb",
  strengthWeight: "lb",
  distance: "mi",
  duration: "s",
  output: "kJ",
  swimDistance: "yd",
  incline: "%",
  pace: "s/mi",
} as const;

export type ExerciseModality =
  | "strength"
  | "bodyweight"
  | "duration"
  | "cardio_distance"
  | "cardio_output"
  | "swim"
  | "walk";

export type RawWorkoutSet = {
  set_number: number;
  reps: number;
  weight: number;
  rest_interval?: number | null;
};

export type DecodedWorkoutSet = {
  setNumber: number;
  reps: number;
  weight: number;
  restIntervalSeconds: number | null;
  modality: ExerciseModality;
  durationSec?: number | null;
  distanceMi?: number | null;
  outputKj?: number | null;
  paceSecPerMi?: number | null;
  inclinePct?: number | null;
  intervalSec?: number | null;
  distanceYd?: number | null;
  swimSetCount?: number | null;
  totalDistanceYd?: number | null;
};

export function inferExerciseModality(
  exerciseName: string,
  workoutFocus: string
): ExerciseModality {
  const name = exerciseName.trim();
  if (workoutFocus === "Cardio") {
    if (name === "Swimming") return "swim";
    if (name === "Walking") return "walk";
    if (name === "Peloton") return "cardio_output";
    if (name === "Core") return "duration";
    return "cardio_distance";
  }
  if (name === "Core") return "duration";
  if (name === "Pull-ups") return "bodyweight";
  return "strength";
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function decodeWorkoutSet(
  set: RawWorkoutSet,
  modality: ExerciseModality
): DecodedWorkoutSet {
  const reps = num(set.reps);
  const weight = num(set.weight);
  const rest =
    set.rest_interval == null || !Number.isFinite(Number(set.rest_interval))
      ? null
      : Number(set.rest_interval);

  const base: DecodedWorkoutSet = {
    setNumber: set.set_number,
    reps,
    weight,
    restIntervalSeconds: rest,
    modality,
  };

  switch (modality) {
    case "strength":
      return base;
    case "bodyweight":
      return base;
    case "duration":
      return { ...base, durationSec: reps };
    case "cardio_distance":
      return {
        ...base,
        durationSec: reps,
        distanceMi: weight,
        paceSecPerMi:
          weight > 0 && reps > 0 ? Math.round(reps / weight) : null,
      };
    case "cardio_output":
      return {
        ...base,
        durationSec: reps,
        outputKj: weight,
      };
    case "swim":
      return {
        ...base,
        durationSec: reps,
        intervalSec: reps,
        distanceYd: weight,
        swimSetCount: rest,
        totalDistanceYd: rest != null && rest > 0 ? rest * weight : null,
      };
    case "walk":
      return {
        ...base,
        durationSec: reps,
        inclinePct: weight,
        paceSecPerMi: rest,
      };
    default: {
      const _exhaustive: never = modality;
      return _exhaustive;
    }
  }
}
