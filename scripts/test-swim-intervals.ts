import assert from "assert";
import {
  decodeWorkoutSet,
  inferExerciseModality,
  WORKOUT_API_SCHEMA_VERSION,
} from "../lib/workout-set-decode";
import { rowsToExerciseSets } from "../lib/workout-exercise-sets";
import {
  emptySwimFormSet,
  formSetToSwimInterval,
  formatSwimIntervalLine,
  formatSwimSessionSummary,
  nextSwimFormSet,
  rawRowToSwimInterval,
  summarizeSwimDecodedSets,
  swimIntervalsFromRawRows,
  swimYardsFromRawRow,
  totalSwimYards,
} from "../lib/swim-intervals";

assert.strictEqual(WORKOUT_API_SCHEMA_VERSION, 3);

// Kevin's 2026-09-24 session: 1×100, 1×100, then alternating 200/100 to 1000.
const kevinIntervals = [
  { reps: 1, distanceYd: 100, intervalSec: 180 },
  { reps: 1, distanceYd: 100, intervalSec: null },
  { reps: 1, distanceYd: 200, intervalSec: null },
  { reps: 1, distanceYd: 100, intervalSec: null },
  { reps: 1, distanceYd: 200, intervalSec: null },
  { reps: 1, distanceYd: 100, intervalSec: null },
  { reps: 1, distanceYd: 200, intervalSec: null },
];
assert.strictEqual(totalSwimYards(kevinIntervals), 1000);
assert.strictEqual(
  formatSwimSessionSummary(kevinIntervals),
  "Swim · 1,000 yd · 7 intervals"
);
assert.strictEqual(
  formatSwimIntervalLine(kevinIntervals[0]),
  "1 × 100 · interval 3:00"
);
assert.strictEqual(
  formatSwimIntervalLine(
    rawRowToSwimInterval({
      reps: 180,
      weight: 100,
      rest_interval: 1,
    })
  ),
  "1 × 100 · interval 3:00"
);
assert.strictEqual(formatSwimIntervalLine(kevinIntervals[2]), "1 × 200");

// Legacy collapsed row: 7 × 100 = 700 (the lossy save we no longer want for new logs).
const legacy = rawRowToSwimInterval({
  reps: 0,
  weight: 100,
  rest_interval: 7,
});
assert.strictEqual(legacy.reps, 7);
assert.strictEqual(legacy.distanceYd, 100);
assert.strictEqual(totalSwimYards([legacy]), 700);
assert.strictEqual(
  formatSwimSessionSummary([legacy]),
  "Swim · 700 yd · 1 interval"
);
assert.strictEqual(formatSwimIntervalLine(legacy), "7 × 100");

// Missing set count still yields a readable 1 × yards interval.
const missingCount = rawRowToSwimInterval({
  reps: 90,
  weight: 50,
  rest_interval: null,
});
assert.strictEqual(missingCount.reps, 1);
assert.strictEqual(swimYardsFromRawRow({ weight: 50, rest_interval: null }), 50);

const decodedLegacy = decodeWorkoutSet(
  { set_number: 1, reps: 90, weight: 50, rest_interval: 8 },
  "swim"
);
assert.strictEqual(decodedLegacy.totalDistanceYd, 400);
assert.strictEqual(decodedLegacy.intervalSec, 90);
assert.strictEqual(decodedLegacy.swimSetCount, 8);

const decodedBlankClock = decodeWorkoutSet(
  { set_number: 2, reps: 0, weight: 200, rest_interval: 1 },
  "swim"
);
assert.strictEqual(decodedBlankClock.totalDistanceYd, 200);
assert.strictEqual(decodedBlankClock.intervalSec, null);

const kevinRows = kevinIntervals.map((interval, index) => ({
  exercise_id: "ex-swim",
  set_number: index + 1,
  reps: interval.intervalSec ?? 0,
  weight: interval.distanceYd,
  rest_interval: interval.reps,
  exercise: { name: "Swimming" },
}));
const form = rowsToExerciseSets(kevinRows, "Cardio");
assert.strictEqual(form.length, 1);
assert.strictEqual(form[0].sets.length, 7);
assert.strictEqual(
  totalSwimYards(form[0].sets.map(formSetToSwimInterval)),
  1000
);
assert.strictEqual(form[0].sets[0].time, 180);
assert.strictEqual(form[0].sets[2].distance, 200);

const next = nextSwimFormSet(form[0].sets[form[0].sets.length - 1]);
assert.strictEqual(next.swimSets, 1);
assert.strictEqual(next.distance, 200);
assert.strictEqual(next.time, 0);

const seeded = emptySwimFormSet();
assert.strictEqual(seeded.distance, 100);
assert.strictEqual(seeded.swimSets, 1);

const fromRows = swimIntervalsFromRawRows(
  kevinRows.map((row) => ({
    reps: row.reps,
    weight: row.weight,
    rest_interval: row.rest_interval,
  }))
);
assert.strictEqual(totalSwimYards(fromRows), 1000);

assert.strictEqual(inferExerciseModality("Swimming", "Cardio"), "swim");

const summary = summarizeSwimDecodedSets(
  kevinIntervals.map((interval, index) =>
    decodeWorkoutSet(
      {
        set_number: index + 1,
        reps: interval.intervalSec ?? 0,
        weight: interval.distanceYd,
        rest_interval: interval.reps,
      },
      "swim"
    )
  )
);
assert.strictEqual(summary.totalDistanceYd, 1000);
assert.strictEqual(summary.intervalCount, 7);

console.log("swim interval helper checks passed");
