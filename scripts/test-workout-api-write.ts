import assert from "assert";
import type { CatalogExercise, WorkoutApiRepository } from "../lib/workout-api-write";
import {
  encodeSetFields,
  executeCreateWorkout,
  executeDeleteWorkout,
  executeGetWorkout,
  executeUpdateWorkout,
  toEncodedSetRows,
} from "../lib/workout-api-write";
import type { WorkoutWithExercises } from "../lib/types";
import { parseWorkoutListQuery } from "../lib/workout-api-helpers";

process.env.WORKOUT_API_KEY = "test-secret";
process.env.WORKOUT_API_USER_ID = "auth0|kevin";

const headerMap = (obj: Record<string, string>) => ({
  get(name: string) {
    return obj[name.toLowerCase()] ?? null;
  },
});

const authHeaders = headerMap({ authorization: "Bearer test-secret" });
const badHeaders = headerMap({ authorization: "Bearer wrong" });
const noHeaders = headerMap({});

const catalog: CatalogExercise[] = [
  { id: "ex-bench", name: "Bench Press", muscle_group_id: "mg-chest", muscle_group: { id: "mg-chest", name: "Chest" } },
  { id: "ex-pullups", name: "Pull-ups", muscle_group_id: "mg-back", muscle_group: { id: "mg-back", name: "Back" } },
  { id: "ex-core", name: "Core", muscle_group_id: "mg-core", muscle_group: { id: "mg-core", name: "Core" } },
  { id: "ex-run", name: "Running", muscle_group_id: "mg-cardio", muscle_group: { id: "mg-cardio", name: "Cardio" } },
  { id: "ex-swim", name: "Swimming", muscle_group_id: "mg-cardio", muscle_group: { id: "mg-cardio", name: "Cardio" } },
  { id: "ex-walk", name: "Walking", muscle_group_id: "mg-cardio", muscle_group: { id: "mg-cardio", name: "Cardio" } },
  { id: "ex-peloton", name: "Peloton", muscle_group_id: "mg-cardio", muscle_group: { id: "mg-cardio", name: "Cardio" } },
];

function createMemoryRepo(seed?: {
  users?: string[];
  workouts?: WorkoutWithExercises[];
}): WorkoutApiRepository & { workouts: WorkoutWithExercises[] } {
  let idCounter = 1;
  const users = seed?.users ?? ["auth0|kevin", "auth0|other"];
  const workouts: WorkoutWithExercises[] = (seed?.workouts ?? []).map((workout) => ({
    ...workout,
    workout_exercises: [...workout.workout_exercises],
  }));

  const repo: WorkoutApiRepository & { workouts: WorkoutWithExercises[] } = {
    workouts,
    async listUserIds() {
      return [...users];
    },
    async listWorkoutUserIds() {
      return [...new Set(workouts.map((w) => w.user_id))];
    },
    async listCatalogExercises() {
      return catalog;
    },
    async insertWorkout(row) {
      const workout: WorkoutWithExercises = {
        id: `w-${idCounter++}`,
        user_id: row.user_id,
        workout_date: row.workout_date,
        focus: row.focus,
        notes: row.notes ?? undefined,
        body_weight: row.body_weight,
        created_at: "2026-10-02T00:00:00.000Z",
        workout_exercises: [],
      };
      workouts.push(workout);
      return { id: workout.id };
    },
    async updateWorkout(id, userId, patch) {
      const workout = workouts.find((w) => w.id === id && w.user_id === userId);
      if (!workout) return "not_found";
      if (patch.workout_date !== undefined) workout.workout_date = patch.workout_date;
      if (patch.focus !== undefined) workout.focus = patch.focus;
      if (patch.notes !== undefined) workout.notes = patch.notes ?? undefined;
      if (patch.body_weight !== undefined) workout.body_weight = patch.body_weight;
      return "ok";
    },
    async replaceWorkoutExercises(workoutId, rows) {
      const workout = workouts.find((w) => w.id === workoutId);
      if (!workout) return { error: "missing workout" };
      workout.workout_exercises = rows.map((row, idx) => {
        const exercise = catalog.find((item) => item.id === row.exercise_id);
        if (!exercise) {
          throw new Error(`unknown exercise ${row.exercise_id}`);
        }
        return {
          id: `we-${workoutId}-${idx}`,
          workout_id: workoutId,
          exercise_id: row.exercise_id,
          set_number: row.set_number,
          reps: row.reps,
          weight: row.weight,
          rest_interval: row.rest_interval,
          created_at: new Date(Date.parse("2026-10-02T00:00:00.000Z") + idx).toISOString(),
          exercise,
        };
      });
      return {};
    },
    async deleteWorkout(id, userId) {
      const index = workouts.findIndex((w) => w.id === id && w.user_id === userId);
      if (index === -1) return "not_found";
      workouts.splice(index, 1);
      return "ok";
    },
    async getWorkout(id, userId) {
      return workouts.find((w) => w.id === id && w.user_id === userId) ?? null;
    },
  };
  return repo;
}

const dateQuery = parseWorkoutListQuery(null, null, "2026-09-20");
assert.ok(!("error" in dateQuery));
assert.strictEqual(dateQuery.from, "2026-09-20");
assert.strictEqual(dateQuery.to, "2026-09-20");
assert.strictEqual(
  "error" in parseWorkoutListQuery("2026-09-01", null, "2026-09-20"),
  true
);
assert.strictEqual(
  (parseWorkoutListQuery("2026-13-01", null, null) as { error: string }).error.includes("from"),
  true
);

const encodedRun = encodeSetFields(
  { durationSec: 1800, distanceMi: 3 },
  "cardio_distance"
);
assert.strictEqual(encodedRun.reps, 1800);
assert.strictEqual(encodedRun.weight, 3);
assert.strictEqual(encodedRun.restIntervalSeconds, 90);

const encodedSwim = encodeSetFields(
  { intervalSec: 90, distanceYd: 50, swimSetCount: 8 },
  "swim"
);
assert.strictEqual(encodedSwim.reps, 90);
assert.strictEqual(encodedSwim.weight, 50);
assert.strictEqual(encodedSwim.restIntervalSeconds, 8);

const encodedWalk = encodeSetFields(
  { durationSec: 2400, inclinePct: 4, paceSecPerMi: 900 },
  "walk"
);
assert.strictEqual(encodedWalk.reps, 2400);
assert.strictEqual(encodedWalk.weight, 4);
assert.strictEqual(encodedWalk.restIntervalSeconds, 900);

assert.deepStrictEqual(
  toEncodedSetRows([
    {
      exercise: catalog[0],
      sets: [{ setNumber: 1, reps: 8, weight: 185, restIntervalSeconds: 90 }],
    },
  ]),
  [
    {
      exercise_id: "ex-bench",
      set_number: 1,
      reps: 8,
      weight: 185,
      rest_interval: 90,
    },
  ]
);

async function expectFail(
  result: { ok: boolean; status?: number; error?: string },
  status: number,
  messagePart?: string
) {
  assert.strictEqual(result.ok, false, `expected failure, got ${JSON.stringify(result)}`);
  assert.strictEqual(result.status, status);
  if (messagePart) {
    assert.ok(
      result.error?.includes(messagePart),
      `expected error to include "${messagePart}", got "${result.error}"`
    );
  }
}

async function main() {
  const repoAuth = createMemoryRepo();
  await expectFail(
    await executeCreateWorkout(noHeaders, { date: "2026-10-01", focus: "Legs" }, repoAuth),
    401,
    "Unauthorized"
  );
  await expectFail(
    await executeCreateWorkout(badHeaders, { date: "2026-10-01", focus: "Legs" }, repoAuth),
    401
  );
  await expectFail(
    await executeUpdateWorkout(noHeaders, "w-1", { notes: "x" }, repoAuth),
    401
  );
  await expectFail(await executeDeleteWorkout(noHeaders, "w-1", repoAuth), 401);
  await expectFail(await executeGetWorkout(badHeaders, "w-1", repoAuth), 401);

  const repoValidation = createMemoryRepo();
  await expectFail(
    await executeCreateWorkout(authHeaders, { focus: "Legs" }, repoValidation),
    400,
    "date"
  );
  await expectFail(
    await executeCreateWorkout(
      authHeaders,
      { date: "2026-10-01", focus: "Push Day" },
      repoValidation
    ),
    400,
    "Invalid focus"
  );
  await expectFail(
    await executeCreateWorkout(
      authHeaders,
      {
        date: "2026-10-01",
        name: "Chest / Shoulders / Triceps",
        exercises: [{ name: "Not A Real Lift", sets: [{ reps: 5, weight: 100 }] }],
      },
      repoValidation
    ),
    400,
    "Unknown exercise"
  );
  await expectFail(
    await executeCreateWorkout(
      authHeaders,
      {
        date: "2026-10-01",
        focus: "Chest / Shoulders / Triceps",
        exercises: [{ name: "Bench Press", sets: [{ reps: -1, weight: 185 }] }],
      },
      repoValidation
    ),
    400,
    "reps"
  );
  await expectFail(
    await executeCreateWorkout(
      authHeaders,
      {
        date: "2026-10-01",
        focus: "Chest / Shoulders / Triceps",
        bodyWeight: "heavy",
      },
      repoValidation
    ),
    400,
    "bodyWeight"
  );

  const repoHappy = createMemoryRepo();
  const created = await executeCreateWorkout(
    authHeaders,
    {
      date: "2026-10-01",
      name: "Chest / Shoulders / Triceps",
      notes: "coach log",
      bodyWeight: 186.5,
      userId: "auth0|other",
      exercises: [
        {
          name: "Bench Press",
          sets: [
            { reps: 8, weight: 185 },
            { setNumber: 2, reps: 6, weight: 195, restIntervalSeconds: 120 },
          ],
        },
        {
          name: "Pull-ups",
          sets: [{ reps: 10, weight: 0 }],
        },
      ],
    },
    repoHappy
  );
  assert.strictEqual(created.ok, true);
  if (!created.ok) throw new Error("create failed");
  assert.strictEqual(created.status, 201);
  assert.strictEqual(created.data.user_id, "auth0|kevin");
  assert.strictEqual(created.data.focus, "Chest / Shoulders / Triceps");
  assert.strictEqual(created.data.body_weight, 186.5);
  assert.strictEqual(created.data.workout_exercises.length, 3);
  const benchSets = created.data.workout_exercises.filter(
    (row) => row.exercise.name === "Bench Press"
  );
  assert.strictEqual(benchSets[0].weight, 185);
  assert.strictEqual(benchSets[0].rest_interval, 90);
  assert.strictEqual(benchSets[1].weight, 195);
  assert.strictEqual(benchSets[1].rest_interval, 120);

  const workoutId = created.data.id;
  const patched = await executeUpdateWorkout(
    authHeaders,
    workoutId,
    {
      notes: "changed rows to 155",
      exercises: [
        {
          name: "Bench Press",
          sets: [
            { reps: 8, weight: 155 },
            { reps: 6, weight: 155 },
            { reps: 6, weight: 155 },
            { reps: 6, weight: 185 },
          ],
        },
      ],
    },
    repoHappy
  );
  assert.strictEqual(patched.ok, true);
  if (!patched.ok) throw new Error("patch failed");
  assert.strictEqual(patched.data.notes, "changed rows to 155");
  assert.strictEqual(patched.data.workout_exercises.length, 4);
  assert.ok(patched.data.workout_exercises.every((row) => row.exercise.name === "Bench Press"));
  assert.strictEqual(patched.data.workout_exercises[0].weight, 155);
  assert.strictEqual(patched.data.workout_exercises[3].weight, 185);
  assert.strictEqual(patched.data.workout_exercises[3].reps, 6);

  const deleted = await executeDeleteWorkout(authHeaders, workoutId, repoHappy);
  assert.strictEqual(deleted.ok, true);
  if (!deleted.ok) throw new Error("delete failed");
  assert.strictEqual(deleted.data.deleted, true);
  await expectFail(await executeGetWorkout(authHeaders, workoutId, repoHappy), 404);

  const repoCardio = createMemoryRepo();
  const cardio = await executeCreateWorkout(
    authHeaders,
    {
      date: "2026-10-02",
      focus: "Cardio",
      exercises: [
        {
          name: "Running",
          sets: [{ durationSec: 1800, distanceMi: 3 }],
        },
        {
          name: "Swimming",
          sets: [{ intervalSec: 90, distanceYd: 50, swimSetCount: 8 }],
        },
        {
          name: "Walking",
          sets: [{ durationSec: 2400, inclinePct: 3, paceSecPerMi: 960 }],
        },
        {
          name: "Peloton",
          sets: [{ durationSec: 1200, outputKj: 140 }],
        },
      ],
    },
    repoCardio
  );
  assert.strictEqual(cardio.ok, true);
  if (!cardio.ok) throw new Error("cardio create failed");
  const byName = Object.fromEntries(
    cardio.data.workout_exercises.map((row) => [row.exercise.name, row])
  );
  assert.strictEqual(byName.Running.reps, 1800);
  assert.strictEqual(byName.Running.weight, 3);
  assert.strictEqual(byName.Swimming.reps, 90);
  assert.strictEqual(byName.Swimming.weight, 50);
  assert.strictEqual(byName.Swimming.rest_interval, 8);
  assert.strictEqual(byName.Walking.weight, 3);
  assert.strictEqual(byName.Walking.rest_interval, 960);
  assert.strictEqual(byName.Peloton.weight, 140);

  const foreign: WorkoutWithExercises = {
    id: "w-foreign",
    user_id: "auth0|other",
    workout_date: "2026-09-30",
    focus: "Legs",
    created_at: "2026-09-30T00:00:00.000Z",
    workout_exercises: [],
  };
  const repoIso = createMemoryRepo({ workouts: [foreign] });
  await expectFail(await executeGetWorkout(authHeaders, "w-foreign", repoIso), 404);
  await expectFail(
    await executeUpdateWorkout(authHeaders, "w-foreign", { notes: "nope" }, repoIso),
    404
  );
  await expectFail(await executeDeleteWorkout(authHeaders, "w-foreign", repoIso), 404);
  assert.strictEqual(repoIso.workouts[0].user_id, "auth0|other");
  assert.strictEqual(repoIso.workouts[0].notes, undefined);

  const previous = process.env.WORKOUT_API_USER_ID;
  delete process.env.WORKOUT_API_USER_ID;
  const repoAmbiguous = createMemoryRepo({
    users: ["auth0|kevin", "auth0|other"],
    workouts: [
      {
        id: "w-k",
        user_id: "auth0|kevin",
        workout_date: "2026-09-01",
        focus: "Legs",
        created_at: "2026-09-01T00:00:00.000Z",
        workout_exercises: [],
      },
      {
        id: "w-o",
        user_id: "auth0|other",
        workout_date: "2026-09-02",
        focus: "Legs",
        created_at: "2026-09-02T00:00:00.000Z",
        workout_exercises: [],
      },
    ],
  });
  await expectFail(
    await executeCreateWorkout(
      authHeaders,
      { date: "2026-10-01", focus: "Other" },
      repoAmbiguous
    ),
    503,
    "WORKOUT_API_USER_ID"
  );
  process.env.WORKOUT_API_USER_ID = previous;

  console.log("workout-api write checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
