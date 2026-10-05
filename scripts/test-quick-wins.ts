import assert from "assert";
import {
  addDaysToIsoDate,
  getIsoMonthStart,
  getIsoWeekStartMonday,
  getIsoYearStart,
  getPacificPeriodBounds,
} from "../lib/pacific-dates";
import {
  BODY_WEIGHT_TARGET_LB,
  collectBodyWeightReadings,
  summarizeBodyWeight,
} from "../lib/body-weight";
import {
  decodeWorkoutSet,
  inferExerciseModality,
} from "../lib/workout-set-decode";
import { rowsToExerciseSets } from "../lib/workout-exercise-sets";
import {
  displayWorkoutFocus,
  focusShortName,
  resolveWorkoutFocus,
} from "../lib/focus-labels";
import { serializeWorkout } from "../lib/workout-api";

assert.strictEqual(addDaysToIsoDate("2026-09-20", -7), "2026-09-13");
assert.strictEqual(addDaysToIsoDate("2026-01-02", -3), "2025-12-30");
assert.strictEqual(getIsoWeekStartMonday("2026-09-20"), "2026-09-14"); // Sunday → prior Monday
assert.strictEqual(getIsoMonthStart("2026-09-20"), "2026-09-01");
assert.strictEqual(getIsoYearStart("2026-09-20"), "2026-01-01");

const pacific = getPacificPeriodBounds(new Date("2026-01-01T07:00:00Z"));
assert.strictEqual(pacific.today, "2025-12-31"); // 11pm PST on Dec 31
assert.strictEqual(pacific.ytdStart, "2025-01-01");

const readings = collectBodyWeightReadings([
  { workout_date: "2026-09-20", body_weight: 186, created_at: "2026-09-20T18:00:00Z" },
  { workout_date: "2026-09-12", body_weight: 188, created_at: "2026-09-12T18:00:00Z" },
  { workout_date: "2026-08-18", body_weight: 192, created_at: "2026-08-18T18:00:00Z" },
  { workout_date: "2026-09-19", body_weight: 0, created_at: "2026-09-19T18:00:00Z" },
]);
assert.strictEqual(readings[0].pounds, 186);
const summary = summarizeBodyWeight(readings, "2026-09-20");
assert.strictEqual(summary.latest?.pounds, 186);
assert.strictEqual(summary.delta7d, -2);
assert.strictEqual(summary.delta30d, -6);
assert.strictEqual(summary.targetLb, BODY_WEIGHT_TARGET_LB);
assert.strictEqual(summary.toTarget, 6);

assert.strictEqual(inferExerciseModality("Bench Press", "Push"), "strength");
assert.strictEqual(inferExerciseModality("Pull-ups", "Pull"), "bodyweight");
assert.strictEqual(inferExerciseModality("Running", "Cardio"), "cardio_distance");
assert.strictEqual(inferExerciseModality("Peloton", "Cardio"), "cardio_output");
assert.strictEqual(inferExerciseModality("Swimming", "Cardio"), "swim");
assert.strictEqual(inferExerciseModality("Walking", "Cardio"), "walk");
assert.strictEqual(inferExerciseModality("Core", "Other"), "duration");

const runSet = decodeWorkoutSet(
  { set_number: 1, reps: 1800, weight: 3, rest_interval: null },
  "cardio_distance"
);
assert.strictEqual(runSet.reps, 1800);
assert.strictEqual(runSet.weight, 3);
assert.strictEqual(runSet.durationSec, 1800);
assert.strictEqual(runSet.distanceMi, 3);
assert.strictEqual(runSet.paceSecPerMi, 600);

const swimSet = decodeWorkoutSet(
  { set_number: 1, reps: 90, weight: 50, rest_interval: 8 },
  "swim"
);
assert.strictEqual(swimSet.totalDistanceYd, 400);
assert.strictEqual(swimSet.intervalSec, 90);

const cloned = rowsToExerciseSets(
  [
    {
      exercise_id: "ex-bench",
      set_number: 1,
      reps: 8,
      weight: 185,
      rest_interval: 90,
      exercise: { name: "Bench Press" },
    },
    {
      exercise_id: "ex-bench",
      set_number: 2,
      reps: 6,
      weight: 195,
      rest_interval: 90,
      exercise: { name: "Bench Press" },
    },
  ],
  "Push",
  { emptyReps: true }
);
assert.strictEqual(cloned.length, 1);
assert.strictEqual(cloned[0].sets.length, 2);
assert.strictEqual(cloned[0].sets[0].weight, 185);
assert.strictEqual(cloned[0].sets[0].reps, 0);
assert.strictEqual(cloned[0].sets[1].weight, 195);
assert.strictEqual(cloned[0].sets[1].reps, 0);

assert.strictEqual(focusShortName("Push"), "Push");
assert.strictEqual(focusShortName("Pull"), "Pull");
assert.strictEqual(focusShortName("Cardio"), "Cardio");

assert.strictEqual(resolveWorkoutFocus("Push"), "Push");
assert.strictEqual(resolveWorkoutFocus("Pull"), "Pull");
assert.strictEqual(resolveWorkoutFocus("Chest / Shoulders / Triceps"), "Push");
assert.strictEqual(resolveWorkoutFocus("Chest/Triceps/Shoulders"), "Push");
assert.strictEqual(resolveWorkoutFocus("Back / Biceps"), "Pull");
assert.strictEqual(displayWorkoutFocus("Chest / Shoulders / Triceps"), "Push");
assert.strictEqual(displayWorkoutFocus("Back / Biceps"), "Pull");
assert.strictEqual(displayWorkoutFocus("Legs"), "Legs");

const legacyWorkout = {
  id: "w-1",
  user_id: "u-1",
  workout_date: "2026-10-01",
  created_at: "2026-10-01T00:00:00Z",
  workout_exercises: [],
};
const serializedLegacy = serializeWorkout({
  ...legacyWorkout,
  focus: "Chest / Shoulders / Triceps",
});
assert.strictEqual(serializedLegacy.focus, "Push");
assert.strictEqual(serializedLegacy.name, "Push");
assert.strictEqual(
  serializeWorkout({ ...legacyWorkout, id: "w-2", focus: "Back / Biceps" }).focus,
  "Pull"
);

console.log("quick-win helper checks passed");
