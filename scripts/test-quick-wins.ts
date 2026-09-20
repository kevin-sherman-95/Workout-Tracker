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
import { focusShortName } from "../lib/focus-labels";

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

assert.strictEqual(inferExerciseModality("Bench Press", "Chest / Shoulders / Triceps"), "strength");
assert.strictEqual(inferExerciseModality("Pull-ups", "Back / Biceps"), "bodyweight");
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
  "Chest / Shoulders / Triceps",
  { emptyReps: true }
);
assert.strictEqual(cloned.length, 1);
assert.strictEqual(cloned[0].sets.length, 2);
assert.strictEqual(cloned[0].sets[0].weight, 185);
assert.strictEqual(cloned[0].sets[0].reps, 0);
assert.strictEqual(cloned[0].sets[1].weight, 195);
assert.strictEqual(cloned[0].sets[1].reps, 0);

assert.strictEqual(focusShortName("Chest / Shoulders / Triceps"), "Push");
assert.strictEqual(focusShortName("Back / Biceps"), "Pull");
assert.strictEqual(focusShortName("Cardio"), "Cardio");

console.log("quick-win helper checks passed");
