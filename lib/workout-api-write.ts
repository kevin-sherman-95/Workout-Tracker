/**
 * Write path for the coach workout API.
 *
 * Persistence matches the log form: workouts + workout_exercises rows, with
 * cardio/core/swim/walk packed into reps/weight/rest_interval the same way.
 * GET payloads (raw + decoded fields) can be posted or patched back.
 */

import { WORKOUT_FOCUS_VALUES } from "./types";
import type { Exercise, WorkoutWithExercises } from "./types";
import { resolveWorkoutFocus } from "./focus-labels";
import {
  getConfiguredWorkoutApiUserId,
  isAuthorizedWorkoutApiRequest,
  isValidIsoDate,
} from "./workout-api-helpers";
import {
  inferExerciseModality,
  type ExerciseModality,
} from "./workout-set-decode";

export type ApiFailure = {
  ok: false;
  status: number;
  error: string;
};

export type ApiSuccess<T> = {
  ok: true;
  status: number;
  data: T;
};

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export type CatalogExercise = Exercise & {
  muscle_group?: { id: string; name: string } | null;
};

export type EncodedSetRow = {
  exercise_id: string;
  set_number: number;
  reps: number;
  weight: number;
  rest_interval: number;
};

export type WorkoutWritePatch = {
  workout_date?: string;
  focus?: string;
  notes?: string | null;
  body_weight?: number | null;
};

export interface WorkoutApiRepository {
  listUserIds(): Promise<string[]>;
  listWorkoutUserIds(): Promise<string[]>;
  listCatalogExercises(): Promise<CatalogExercise[]>;
  insertWorkout(row: {
    user_id: string;
    workout_date: string;
    focus: string;
    notes: string | null;
    body_weight: number | null;
  }): Promise<{ id: string } | { error: string; code?: string }>;
  updateWorkout(
    id: string,
    userId: string,
    patch: WorkoutWritePatch
  ): Promise<"ok" | "not_found" | { error: string }>;
  replaceWorkoutExercises(
    workoutId: string,
    rows: EncodedSetRow[]
  ): Promise<{ error?: string }>;
  deleteWorkout(
    id: string,
    userId: string
  ): Promise<"ok" | "not_found" | { error: string }>;
  getWorkout(
    id: string,
    userId: string
  ): Promise<WorkoutWithExercises | null | { error: string }>;
  touchExerciseUsage?(userId: string, exerciseIds: string[]): Promise<void>;
}

export type ValidatedSet = {
  setNumber: number;
  reps: number;
  weight: number;
  restIntervalSeconds: number;
};

export type ValidatedExercise = {
  exercise: CatalogExercise;
  sets: ValidatedSet[];
};

export type ValidatedCreateWorkout = {
  date: string;
  focus: string;
  notes: string | null;
  bodyWeight: number | null;
  exercises: ValidatedExercise[];
};

export type ValidatedPatchWorkout = {
  date?: string;
  focus?: string;
  notes?: string | null;
  bodyWeight?: number | null;
  exercises?: ValidatedExercise[];
};

const FOCUS_LIST = WORKOUT_FOCUS_VALUES.join(", ");
const MAX_BODY_WEIGHT = 999.9;
const MAX_WEIGHT = 999.99;
const MAX_REPS = 86400;
const MAX_REST = 86400;
const MAX_SETS = 100;

function fail(status: number, error: string): ApiFailure {
  return { ok: false, status, error };
}

function success<T>(status: number, data: T): ApiSuccess<T> {
  return { ok: true, status, data };
}

export function unauthorizedResult(): ApiFailure {
  return fail(401, "Unauthorized");
}

export function requireWorkoutApiAuth(headers: {
  get(name: string): string | null;
}): ApiFailure | null {
  if (!isAuthorizedWorkoutApiRequest(headers)) {
    return unauthorizedResult();
  }
  return null;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCleanNumberString(value: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(value.trim());
}

function isCleanIntegerString(value: string): boolean {
  return /^-?\d+$/.test(value.trim());
}

function parseNumberField(
  value: unknown,
  field: string,
  options: { integer?: boolean; min?: number; max?: number; allowNull?: boolean } = {}
): { value: number | null } | { error: string } {
  if (value === undefined) {
    return { error: `${field} is required.` };
  }
  if (value === null) {
    if (options.allowNull) return { value: null };
    return { error: `${field} cannot be null.` };
  }
  let n: number;
  if (typeof value === "number") {
    n = value;
  } else if (typeof value === "string" && value.trim() !== "") {
    const ok = options.integer
      ? isCleanIntegerString(value)
      : isCleanNumberString(value);
    if (!ok) {
      return { error: `${field} must be a number.` };
    }
    n = Number(value);
  } else {
    return { error: `${field} must be a number.` };
  }
  if (!Number.isFinite(n)) {
    return { error: `${field} must be a finite number.` };
  }
  if (options.integer && !Number.isInteger(n)) {
    return { error: `${field} must be an integer.` };
  }
  if (options.min !== undefined && n < options.min) {
    return { error: `${field} must be at least ${options.min}.` };
  }
  if (options.max !== undefined && n > options.max) {
    return { error: `${field} must be at most ${options.max}.` };
  }
  return { value: n };
}

function parseOptionalNumberField(
  value: unknown,
  field: string,
  options: { integer?: boolean; min?: number; max?: number; allowNull?: boolean } = {}
): { provided: false } | { provided: true; value: number | null } | { error: string } {
  if (value === undefined) return { provided: false };
  const parsed = parseNumberField(value, field, { ...options, allowNull: true });
  if ("error" in parsed) return parsed;
  if (parsed.value === null) {
    if (options.allowNull === false) {
      return { error: `${field} cannot be null.` };
    }
    return { provided: true, value: null };
  }
  return { provided: true, value: parsed.value };
}

function parseOptionalString(
  value: unknown,
  field: string,
  options: { allowNull?: boolean } = {}
): { provided: false } | { provided: true; value: string | null } | { error: string } {
  if (value === undefined) return { provided: false };
  if (value === null) {
    if (options.allowNull === false) {
      return { error: `${field} cannot be null.` };
    }
    return { provided: true, value: null };
  }
  if (typeof value !== "string") {
    return { error: `${field} must be a string.` };
  }
  const trimmed = value.trim();
  return { provided: true, value: trimmed === "" ? null : trimmed };
}

function parseFocus(value: unknown, field: string): { value: string } | { error: string } {
  if (typeof value !== "string" || value.trim() === "") {
    return { error: `${field} is required.` };
  }
  const focus = value.trim();
  const resolved = resolveWorkoutFocus(focus);
  if (!resolved) {
    return {
      error: `Invalid ${field} "${focus}". Use one of: ${FOCUS_LIST}.`,
    };
  }
  return { value: resolved };
}

function parseBodyWeight(
  value: unknown,
  field: string
): { provided: false } | { provided: true; value: number | null } | { error: string } {
  const parsed = parseOptionalNumberField(value, field, {
    min: 0,
    max: MAX_BODY_WEIGHT,
    allowNull: true,
  });
  if ("error" in parsed || !parsed.provided) return parsed;
  if (parsed.value === 0) return { provided: true, value: null };
  return parsed;
}

function firstDefined(...values: unknown[]): unknown {
  for (const value of values) {
    if (value !== undefined) return value;
  }
  return undefined;
}

function defaultRestForModality(modality: ExerciseModality): number {
  switch (modality) {
    case "swim":
      return 1;
    case "walk":
      return 0;
    case "strength":
    case "bodyweight":
    case "duration":
    case "cardio_distance":
    case "cardio_output":
      return 90;
    default: {
      const _exhaustive: never = modality;
      return _exhaustive;
    }
  }
}

export function encodeSetFields(
  set: Record<string, unknown>,
  modality: ExerciseModality
): {
  reps?: unknown;
  weight?: unknown;
  restIntervalSeconds?: unknown;
} {
  const reps = firstDefined(set.reps, set.durationSec, set.intervalSec);
  let weight = firstDefined(
    set.weight,
    set.distanceMi,
    set.outputKj,
    set.distanceYd,
    set.inclinePct
  );
  if (weight === undefined && (modality === "duration" || modality === "bodyweight")) {
    weight = 0;
  }
  const rest = firstDefined(
    set.restIntervalSeconds,
    set.rest_interval,
    set.swimSetCount,
    set.paceSecPerMi
  );
  return {
    reps,
    weight,
    restIntervalSeconds:
      rest === undefined || rest === null
        ? defaultRestForModality(modality)
        : rest,
  };
}

function isApiFailure(value: unknown): value is ApiFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    (value as { ok?: unknown }).ok === false
  );
}

function resolveCatalogExercise(
  input: Record<string, unknown>,
  catalog: CatalogExercise[],
  field: string
): CatalogExercise | { error: string } {
  const id = typeof input.id === "string" ? input.id.trim() : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!id && !name) {
    return { error: `${field} must include name or id.` };
  }
  if (id) {
    const byId = catalog.find((exercise) => exercise.id === id);
    if (!byId) {
      return { error: `${field} id "${id}" was not found in the exercise catalog.` };
    }
    if (name && byId.name.toLowerCase() !== name.toLowerCase()) {
      return {
        error: `${field} id "${id}" is "${byId.name}", not "${name}".`,
      };
    }
    return byId;
  }
  const matches = catalog.filter(
    (exercise) => exercise.name.toLowerCase() === name.toLowerCase()
  );
  if (matches.length === 0) {
    return {
      error: `Unknown exercise "${name}". Use a name from the exercise catalog.`,
    };
  }
  return matches.find((exercise) => exercise.name === name) ?? matches[0];
}

function parseSet(
  raw: unknown,
  field: string,
  modality: ExerciseModality,
  fallbackSetNumber: number
): ValidatedSet | { error: string } {
  if (!isPlainObject(raw)) {
    return { error: `${field} must be an object.` };
  }
  const encoded = encodeSetFields(raw, modality);
  const setNumber = parseOptionalNumberField(
    firstDefined(raw.setNumber, raw.set_number),
    `${field}.setNumber`,
    { integer: true, min: 1, max: MAX_SETS, allowNull: false }
  );
  if ("error" in setNumber) return setNumber;
  const reps = parseNumberField(encoded.reps, `${field}.reps`, {
    integer: true,
    min: 0,
    max: MAX_REPS,
  });
  if ("error" in reps) return reps;
  const weight = parseNumberField(encoded.weight, `${field}.weight`, {
    min: 0,
    max: MAX_WEIGHT,
  });
  if ("error" in weight) return weight;
  const rest = parseNumberField(
    encoded.restIntervalSeconds,
    `${field}.restIntervalSeconds`,
    { integer: true, min: 0, max: MAX_REST }
  );
  if ("error" in rest) return rest;

  return {
    setNumber: setNumber.provided ? (setNumber.value as number) : fallbackSetNumber,
    reps: reps.value as number,
    weight: Number(weight.value),
    restIntervalSeconds: rest.value as number,
  };
}

function parseExercises(
  raw: unknown,
  focus: string,
  catalog: CatalogExercise[]
): ValidatedExercise[] | { error: string } {
  if (!Array.isArray(raw)) {
    return { error: "exercises must be an array." };
  }

  const seen = new Set<string>();
  const exercises: ValidatedExercise[] = [];

  for (let i = 0; i < raw.length; i += 1) {
    const field = `exercises[${i}]`;
    const item = raw[i];
    if (!isPlainObject(item)) {
      return { error: `${field} must be an object.` };
    }
    const exercise = resolveCatalogExercise(item, catalog, field);
    if ("error" in exercise) return exercise;
    if (seen.has(exercise.id)) {
      return {
        error: `${field} duplicates "${exercise.name}". Combine sets onto one exercise entry.`,
      };
    }
    seen.add(exercise.id);

    if (!Array.isArray(item.sets)) {
      return { error: `${field}.sets must be an array.` };
    }
    if (item.sets.length === 0) {
      return { error: `${field}.sets must contain at least one set.` };
    }

    const modality = inferExerciseModality(exercise.name, focus);
    const sets: ValidatedSet[] = [];
    const setNumbers = new Set<number>();
    for (let s = 0; s < item.sets.length; s += 1) {
      const parsed = parseSet(item.sets[s], `${field}.sets[${s}]`, modality, s + 1);
      if ("error" in parsed) return parsed;
      if (setNumbers.has(parsed.setNumber)) {
        return {
          error: `${field}.sets has duplicate setNumber ${parsed.setNumber}.`,
        };
      }
      setNumbers.add(parsed.setNumber);
      sets.push(parsed);
    }
    sets.sort((a, b) => a.setNumber - b.setNumber);
    exercises.push({ exercise, sets });
  }

  return exercises;
}

function parseCreateBody(
  raw: unknown,
  catalog: CatalogExercise[]
): ValidatedCreateWorkout | { error: string } {
  if (!isPlainObject(raw)) {
    return { error: "Request body must be a JSON object." };
  }

  const dateValue = raw.date ?? raw.workoutDate ?? raw.workout_date;
  if (typeof dateValue !== "string" || !isValidIsoDate(dateValue.trim())) {
    return { error: "Invalid or missing date. Use YYYY-MM-DD." };
  }

  const focusInput = raw.focus ?? raw.name;
  const focus = parseFocus(focusInput, raw.focus !== undefined ? "focus" : "name");
  if ("error" in focus) return focus;

  const notes = parseOptionalString(raw.notes, "notes", { allowNull: true });
  if ("error" in notes) return notes;

  const bodyWeight = parseBodyWeight(raw.bodyWeight ?? raw.body_weight, "bodyWeight");
  if ("error" in bodyWeight) return bodyWeight;

  let exercises: ValidatedExercise[] = [];
  if (raw.exercises !== undefined) {
    const parsed = parseExercises(raw.exercises, focus.value, catalog);
    if ("error" in parsed) return parsed;
    exercises = parsed;
  }

  return {
    date: dateValue.trim(),
    focus: focus.value,
    notes: notes.provided ? notes.value : null,
    bodyWeight: bodyWeight.provided ? bodyWeight.value : null,
    exercises,
  };
}

function parsePatchBody(
  raw: unknown,
  catalog: CatalogExercise[],
  currentFocus: string
): ValidatedPatchWorkout | { error: string } {
  if (!isPlainObject(raw)) {
    return { error: "Request body must be a JSON object." };
  }

  const patch: ValidatedPatchWorkout = {};
  const dateValue = raw.date ?? raw.workoutDate ?? raw.workout_date;
  if (dateValue !== undefined) {
    if (typeof dateValue !== "string" || !isValidIsoDate(dateValue.trim())) {
      return { error: "Invalid date. Use YYYY-MM-DD." };
    }
    patch.date = dateValue.trim();
  }

  if (raw.focus !== undefined || raw.name !== undefined) {
    const focus = parseFocus(
      raw.focus !== undefined ? raw.focus : raw.name,
      raw.focus !== undefined ? "focus" : "name"
    );
    if ("error" in focus) return focus;
    patch.focus = focus.value;
  }

  const notes = parseOptionalString(raw.notes, "notes", { allowNull: true });
  if ("error" in notes) return notes;
  if (notes.provided) patch.notes = notes.value;

  const bodyWeight = parseBodyWeight(raw.bodyWeight ?? raw.body_weight, "bodyWeight");
  if ("error" in bodyWeight) return bodyWeight;
  if (bodyWeight.provided) patch.bodyWeight = bodyWeight.value;

  if (raw.exercises !== undefined) {
    const parsed = parseExercises(
      raw.exercises,
      patch.focus ?? currentFocus,
      catalog
    );
    if ("error" in parsed) return parsed;
    patch.exercises = parsed;
  }

  if (
    patch.date === undefined &&
    patch.focus === undefined &&
    patch.notes === undefined &&
    patch.bodyWeight === undefined &&
    patch.exercises === undefined
  ) {
    return {
      error:
        "PATCH body must include at least one of: date, name/focus, notes, bodyWeight, exercises.",
    };
  }

  return patch;
}

export function toEncodedSetRows(exercises: ValidatedExercise[]): EncodedSetRow[] {
  return exercises.flatMap(({ exercise, sets }) =>
    sets.map((set) => ({
      exercise_id: exercise.id,
      set_number: set.setNumber,
      reps: set.reps,
      weight: set.weight,
      rest_interval: set.restIntervalSeconds,
    }))
  );
}

/**
 * Resolve the single owner writes may target.
 * 1) WORKOUT_API_USER_ID if set
 * 2) the only row in users
 * 3) the only distinct userId that already owns workouts
 * Never guess when zero or more than one workout owner exists.
 */
export async function resolveWriteOwnerUserId(
  repo: WorkoutApiRepository
): Promise<{ userId: string } | ApiFailure> {
  const configured = getConfiguredWorkoutApiUserId();
  if (configured) return { userId: configured };

  const userIds = await repo.listUserIds();
  if (userIds.length === 1) return { userId: userIds[0] };

  const workoutUsers = await repo.listWorkoutUserIds();
  if (workoutUsers.length === 1) return { userId: workoutUsers[0] };

  return fail(
    503,
    "WORKOUT_API_USER_ID is required for write operations when the database has zero or multiple users. Set it to the Auth0 user id (sub) that owns this API key."
  );
}

function asRepoError(
  value: WorkoutWithExercises | null | { error: string }
): value is { error: string } {
  return typeof value === "object" && value !== null && "error" in value && !("id" in value);
}

async function loadOwnedWorkout(
  repo: WorkoutApiRepository,
  id: string,
  userId: string
): Promise<WorkoutWithExercises | ApiFailure> {
  const workout = await repo.getWorkout(id, userId);
  if (asRepoError(workout)) {
    return fail(500, "Failed to load workout.");
  }
  if (!workout) {
    return fail(404, "Workout not found.");
  }
  return workout;
}

async function persistExercises(
  repo: WorkoutApiRepository,
  workoutId: string,
  userId: string,
  exercises: ValidatedExercise[]
): Promise<ApiFailure | null> {
  const rows = toEncodedSetRows(exercises);
  const replaced = await repo.replaceWorkoutExercises(workoutId, rows);
  if (replaced.error) {
    return fail(500, "Failed to save workout exercises.");
  }
  if (repo.touchExerciseUsage && exercises.length > 0) {
    try {
      await repo.touchExerciseUsage(
        userId,
        [...new Set(exercises.map((item) => item.exercise.id))]
      );
    } catch (err) {
      console.error("Workout API usage update failed:", err);
    }
  }
  return null;
}

function mapInsertError(error: string, code?: string): ApiFailure {
  const text = `${code ?? ""} ${error}`.toLowerCase();
  if (
    text.includes("foreign key") ||
    text.includes("users") ||
    text.includes("user_id")
  ) {
    return fail(
      503,
      "API user id is missing from the users table. Set WORKOUT_API_USER_ID to the Auth0 user id (sub) that owns this key."
    );
  }
  return fail(500, "Failed to create workout.");
}

export async function executeCreateWorkout(
  headers: { get(name: string): string | null },
  rawBody: unknown,
  repo: WorkoutApiRepository
): Promise<ApiResult<WorkoutWithExercises>> {
  const unauthorized = requireWorkoutApiAuth(headers);
  if (unauthorized) return unauthorized;

  const owner = await resolveWriteOwnerUserId(repo);
  if ("error" in owner) return owner;

  let catalog: CatalogExercise[];
  try {
    catalog = await repo.listCatalogExercises();
  } catch (err) {
    console.error("Workout API catalog load failed:", err);
    return fail(500, "Failed to load exercise catalog.");
  }

  const parsed = parseCreateBody(rawBody, catalog);
  if ("error" in parsed) return fail(400, parsed.error);

  const inserted = await repo.insertWorkout({
    user_id: owner.userId,
    workout_date: parsed.date,
    focus: parsed.focus,
    notes: parsed.notes,
    body_weight: parsed.bodyWeight,
  });
  if ("error" in inserted) {
    return mapInsertError(inserted.error, inserted.code);
  }

  if (parsed.exercises.length > 0) {
    const persist = await persistExercises(
      repo,
      inserted.id,
      owner.userId,
      parsed.exercises
    );
    if (persist) return persist;
  }

  const created = await loadOwnedWorkout(repo, inserted.id, owner.userId);
  if (isApiFailure(created)) return created;
  return success(201, created);
}

export async function executeUpdateWorkout(
  headers: { get(name: string): string | null },
  id: string,
  rawBody: unknown,
  repo: WorkoutApiRepository
): Promise<ApiResult<WorkoutWithExercises>> {
  const unauthorized = requireWorkoutApiAuth(headers);
  if (unauthorized) return unauthorized;

  const workoutId = id.trim();
  if (!workoutId) return fail(400, "Missing workout id.");

  const owner = await resolveWriteOwnerUserId(repo);
  if ("error" in owner) return owner;

  const existing = await loadOwnedWorkout(repo, workoutId, owner.userId);
  if (isApiFailure(existing)) return existing;

  let catalog: CatalogExercise[] = [];
  if (isPlainObject(rawBody) && rawBody.exercises !== undefined) {
    try {
      catalog = await repo.listCatalogExercises();
    } catch (err) {
      console.error("Workout API catalog load failed:", err);
      return fail(500, "Failed to load exercise catalog.");
    }
  }

  const parsed = parsePatchBody(rawBody, catalog, existing.focus);
  if ("error" in parsed) return fail(400, parsed.error);

  const patch: WorkoutWritePatch = {};
  if (parsed.date !== undefined) patch.workout_date = parsed.date;
  if (parsed.focus !== undefined) patch.focus = parsed.focus;
  if (parsed.notes !== undefined) patch.notes = parsed.notes;
  if (parsed.bodyWeight !== undefined) patch.body_weight = parsed.bodyWeight;

  if (Object.keys(patch).length > 0) {
    const updated = await repo.updateWorkout(workoutId, owner.userId, patch);
    if (updated === "not_found") return fail(404, "Workout not found.");
    if (typeof updated === "object") return fail(500, "Failed to update workout.");
  }

  if (parsed.exercises) {
    const persist = await persistExercises(
      repo,
      workoutId,
      owner.userId,
      parsed.exercises
    );
    if (persist) return persist;
  }

  const workout = await loadOwnedWorkout(repo, workoutId, owner.userId);
  if (isApiFailure(workout)) return workout;
  return success(200, workout);
}

export async function executeDeleteWorkout(
  headers: { get(name: string): string | null },
  id: string,
  repo: WorkoutApiRepository
): Promise<ApiResult<{ id: string; deleted: true }>> {
  const unauthorized = requireWorkoutApiAuth(headers);
  if (unauthorized) return unauthorized;

  const workoutId = id.trim();
  if (!workoutId) return fail(400, "Missing workout id.");

  const owner = await resolveWriteOwnerUserId(repo);
  if ("error" in owner) return owner;

  const existing = await loadOwnedWorkout(repo, workoutId, owner.userId);
  if (isApiFailure(existing)) return existing;

  const deleted = await repo.deleteWorkout(workoutId, owner.userId);
  if (deleted === "not_found") return fail(404, "Workout not found.");
  if (typeof deleted === "object") return fail(500, "Failed to delete workout.");

  return success(200, { id: workoutId, deleted: true });
}

export async function executeGetWorkout(
  headers: { get(name: string): string | null },
  id: string,
  repo: WorkoutApiRepository
): Promise<ApiResult<WorkoutWithExercises>> {
  const unauthorized = requireWorkoutApiAuth(headers);
  if (unauthorized) return unauthorized;

  const workoutId = id.trim();
  if (!workoutId) return fail(400, "Missing workout id.");

  const owner = await resolveWriteOwnerUserId(repo);
  if ("error" in owner) return owner;

  const workout = await loadOwnedWorkout(repo, workoutId, owner.userId);
  if (isApiFailure(workout)) return workout;
  return success(200, workout);
}
