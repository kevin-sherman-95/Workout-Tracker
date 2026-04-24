"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { ExerciseProgressChart } from "@/components/exercise-progress-chart";
import { format } from "date-fns";
import type { WorkoutWithExercises, Exercise } from "@/lib/types";

const ALL_FOCUSES = "__all__";

const CANONICAL_FOCUSES = [
  "Chest / Shoulders / Triceps",
  "Back / Biceps",
  "Legs",
  "Full Body",
  "Cardio",
  "Other",
];

function normalizeFocusKey(focus: string | null | undefined): string {
  if (!focus) return "";
  return focus.toLowerCase().replace(/\s*\/\s*/g, "/").trim();
}

const CANONICAL_FOCUS_BY_KEY = new Map(
  CANONICAL_FOCUSES.map((f) => [normalizeFocusKey(f), f])
);

function canonicalizeFocusLabel(focus: string): string {
  const key = normalizeFocusKey(focus);
  return CANONICAL_FOCUS_BY_KEY.get(key) ?? focus;
}

const REP_COUNT_EXERCISES = new Set(["Pull-ups"]);
const RUNNING_EXERCISES = new Set(["Running"]);
const CARDIO_DISTANCE_EXERCISES = new Set(["Cycling"]);
const CARDIO_OUTPUT_EXERCISES = new Set(["Peloton"]);
const SWIM_EXERCISES = new Set(["Swimming"]);
const DURATION_ONLY_EXERCISES = new Set(["Walking", "Core"]);

type PRKind =
  | "weight"
  | "session-reps"
  | "running"
  | "cardio-distance"
  | "cardio-output"
  | "swim"
  | "duration";

function getPRKind(exerciseName: string): PRKind {
  if (REP_COUNT_EXERCISES.has(exerciseName)) return "session-reps";
  if (RUNNING_EXERCISES.has(exerciseName)) return "running";
  if (CARDIO_DISTANCE_EXERCISES.has(exerciseName)) return "cardio-distance";
  if (CARDIO_OUTPUT_EXERCISES.has(exerciseName)) return "cardio-output";
  if (SWIM_EXERCISES.has(exerciseName)) return "swim";
  if (DURATION_ONLY_EXERCISES.has(exerciseName)) return "duration";
  return "weight";
}

type PREntry =
  | {
      kind: "weight";
      date: string;
      workoutId: string;
      exerciseId: string;
      weight: number;
      reps: number;
    }
  | {
      kind: "session-reps";
      date: string;
      workoutId: string;
      exerciseId: string;
      totalReps: number;
      sets: number;
    }
  | {
      kind: "running";
      date: string;
      workoutId: string;
      exerciseId: string;
      distanceMi: number;
      timeSec: number;
    }
  | {
      kind: "cardio-distance";
      date: string;
      workoutId: string;
      exerciseId: string;
      distanceMi: number;
      timeSec: number;
    }
  | {
      kind: "cardio-output";
      date: string;
      workoutId: string;
      exerciseId: string;
      outputKJ: number;
      timeSec: number;
    }
  | {
      kind: "swim";
      date: string;
      workoutId: string;
      exerciseId: string;
      totalYards: number;
      timeSec: number;
      sets: number;
    }
  | {
      kind: "duration";
      date: string;
      workoutId: string;
      exerciseId: string;
      timeSec: number;
    };

interface ExercisePR {
  exercise: string;
  muscleGroup?: string;
  allTime: PREntry;
  ytd: PREntry | null;
}

interface SessionSummary {
  workoutId: string;
  exerciseId: string;
  date: string;
  inYtd: boolean;
  totalReps: number;
  setCount: number;
  bestSetWeight: number;
  bestSetReps: number;
  /** Sum of `weight` across rows — miles for Running/Cycling, kJ for Peloton. */
  totalDistanceOrOutput: number;
  /** Sum of `reps` interpreted as seconds — used for cardio/duration timings. */
  totalTimeSec: number;
  /** For Swimming: sum of (weight × rest_interval) across rows = total yards. */
  totalSwimYards: number;
  /** For Swimming: sum of rest_interval across rows = total set count. */
  totalSwimSets: number;
}

function getExercisePRs(
  workouts: WorkoutWithExercises[],
  currentYear: number
): ExercisePR[] {
  const byExercise = new Map<
    string,
    {
      name: string;
      muscleGroup?: string;
      sessions: Map<string, SessionSummary>;
    }
  >();

  workouts.forEach((workout) => {
    const inYtd = new Date(workout.workout_date).getFullYear() === currentYear;

    workout.workout_exercises.forEach((we) => {
      if (!we.exercise) return;
      const name = we.exercise.name;
      const muscleGroup = we.exercise.muscle_group?.name;

      let entry = byExercise.get(name);
      if (!entry) {
        entry = { name, muscleGroup, sessions: new Map() };
        byExercise.set(name, entry);
      }

      let session = entry.sessions.get(workout.id);
      if (!session) {
        session = {
          workoutId: workout.id,
          exerciseId: we.exercise.id,
          date: workout.workout_date,
          inYtd,
          totalReps: 0,
          setCount: 0,
          bestSetWeight: -Infinity,
          bestSetReps: 0,
          totalDistanceOrOutput: 0,
          totalTimeSec: 0,
          totalSwimYards: 0,
          totalSwimSets: 0,
        };
        entry.sessions.set(workout.id, session);
      }

      const weight = Number(we.weight) || 0;
      const reps = Number(we.reps) || 0;
      const swimSets = Number(we.rest_interval) || 0;

      session.totalReps += we.reps;
      session.setCount += 1;
      if (we.weight > session.bestSetWeight) {
        session.bestSetWeight = we.weight;
        session.bestSetReps = we.reps;
      }
      // Cardio/duration rows store time in `reps` (seconds) and distance/output
      // in `weight`. Swimming additionally stores per-row set count in
      // `rest_interval`, so total yards = weight (yd/set) × rest_interval.
      session.totalDistanceOrOutput += weight;
      session.totalTimeSec += reps;
      session.totalSwimYards += weight * swimSets;
      session.totalSwimSets += swimSets;
    });
  });

  const results: ExercisePR[] = [];

  byExercise.forEach(({ name, muscleGroup, sessions }) => {
    const sessionList = Array.from(sessions.values());
    const kind = getPRKind(name);

    const toEntry = (s: SessionSummary): PREntry => {
      switch (kind) {
        case "session-reps":
          return {
            kind: "session-reps",
            date: s.date,
            workoutId: s.workoutId,
            exerciseId: s.exerciseId,
            totalReps: s.totalReps,
            sets: s.setCount,
          };
        case "running":
          return {
            kind: "running",
            date: s.date,
            workoutId: s.workoutId,
            exerciseId: s.exerciseId,
            distanceMi: s.totalDistanceOrOutput,
            timeSec: s.totalTimeSec,
          };
        case "cardio-distance":
          return {
            kind: "cardio-distance",
            date: s.date,
            workoutId: s.workoutId,
            exerciseId: s.exerciseId,
            distanceMi: s.totalDistanceOrOutput,
            timeSec: s.totalTimeSec,
          };
        case "cardio-output":
          return {
            kind: "cardio-output",
            date: s.date,
            workoutId: s.workoutId,
            exerciseId: s.exerciseId,
            outputKJ: s.totalDistanceOrOutput,
            timeSec: s.totalTimeSec,
          };
        case "swim":
          return {
            kind: "swim",
            date: s.date,
            workoutId: s.workoutId,
            exerciseId: s.exerciseId,
            totalYards: s.totalSwimYards,
            timeSec: s.totalTimeSec,
            sets: s.totalSwimSets,
          };
        case "duration":
          return {
            kind: "duration",
            date: s.date,
            workoutId: s.workoutId,
            exerciseId: s.exerciseId,
            timeSec: s.totalTimeSec,
          };
        case "weight":
        default:
          return {
            kind: "weight",
            date: s.date,
            workoutId: s.workoutId,
            exerciseId: s.exerciseId,
            weight: s.bestSetWeight === -Infinity ? 0 : s.bestSetWeight,
            reps: s.bestSetReps,
          };
      }
    };

    const score = (s: SessionSummary) => {
      switch (kind) {
        case "session-reps":
          return s.totalReps;
        case "running":
        case "cardio-distance":
        case "cardio-output":
          return s.totalDistanceOrOutput;
        case "swim":
          return s.totalSwimYards;
        case "duration":
          return s.totalTimeSec;
        case "weight":
        default:
          return s.bestSetWeight;
      }
    };

    const bestOf = (list: SessionSummary[]) =>
      list.reduce<SessionSummary | null>((best, s) => {
        if (!best) return s;
        return score(s) > score(best) ? s : best;
      }, null);

    const allTimeSession = bestOf(sessionList);
    if (!allTimeSession) return;
    // Hide exercises whose best session has no meaningful score (e.g. a Cycling
    // row logged with 0 mi). They'll reappear automatically once a session
    // with real data is logged.
    if (score(allTimeSession) <= 0) return;

    const ytdSession = bestOf(sessionList.filter((s) => s.inYtd));
    const ytdHasRealData = ytdSession != null && score(ytdSession) > 0;

    results.push({
      exercise: name,
      muscleGroup,
      allTime: toEntry(allTimeSession),
      ytd: ytdHasRealData ? toEntry(ytdSession!) : null,
    });
  });

  return results.sort((a, b) => {
    const groupCompare = (a.muscleGroup || "zzz").localeCompare(
      b.muscleGroup || "zzz"
    );
    if (groupCompare !== 0) return groupCompare;
    return a.exercise.localeCompare(b.exercise);
  });
}

function loadWorkoutsFromLocalStorage(): WorkoutWithExercises[] {
  if (typeof window === "undefined") return [];

  const mockWorkouts = JSON.parse(localStorage.getItem("mock-workouts") || "[]");
  const mockWorkoutExercises = JSON.parse(
    localStorage.getItem("mock-workout-exercises") || "[]"
  );
  const mockExercises = JSON.parse(
    localStorage.getItem("mock-exercises") || "[]"
  );

  const exerciseList: Exercise[] = mockExercises;
  const mockUser = JSON.parse(sessionStorage.getItem("mock-user") || "null");

  const userWorkouts = mockUser
    ? mockWorkouts.filter((w: { user_id?: string }) => w.user_id === mockUser.id)
    : mockWorkouts;

  const workoutsWithExercises: WorkoutWithExercises[] = userWorkouts.map(
    (workout: {
      id: string;
      workout_date: string;
      focus: string;
      notes?: string;
      created_at: string;
      user_id?: string;
    }) => {
      const workoutExercises = mockWorkoutExercises
        .filter((we: { workout_id: string }) => we.workout_id === workout.id)
        .map((we: any) => {
          const exercise = we.exercise_name
            ? { id: we.exercise_id, name: we.exercise_name, muscle_group_id: "" }
            : exerciseList.find((e) => e.id === we.exercise_id) || {
                id: we.exercise_id,
                name: we.exercise_id.startsWith("mock-")
                  ? `Exercise ${we.exercise_id.slice(-6)}`
                  : we.exercise_id,
                muscle_group_id: "",
              };
          return { ...we, exercise };
        });

      return {
        ...workout,
        workout_exercises: workoutExercises,
      };
    }
  );

  workoutsWithExercises.sort(
    (a, b) =>
      new Date(b.workout_date).getTime() - new Date(a.workout_date).getTime()
  );
  return workoutsWithExercises;
}

interface ProgressPageClientProps {
  serverWorkouts: WorkoutWithExercises[] | null;
}

export function ProgressPageClient({ serverWorkouts }: ProgressPageClientProps) {
  const [workouts, setWorkouts] = useState<WorkoutWithExercises[] | null>(
    serverWorkouts
  );

  const loadFromStorage = useCallback(() => {
    const fromStorage = loadWorkoutsFromLocalStorage();
    setWorkouts(fromStorage.length > 0 ? fromStorage : null);
  }, []);

  useEffect(() => {
    if (serverWorkouts && serverWorkouts.length > 0) {
      setWorkouts(serverWorkouts);
      return;
    }
    loadFromStorage();
  }, [serverWorkouts, loadFromStorage]);

  useEffect(() => {
    const handleUpdate = () => loadFromStorage();
    window.addEventListener("workoutUpdated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("workoutUpdated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [loadFromStorage]);

  if (!workouts || workouts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Progress</h1>
          <p className="text-muted-foreground mt-2">
            Track your exercise progress over time
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No workouts yet. Start logging your workouts to see your progress!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedWorkouts = [...workouts].reverse();
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Progress</h1>
        <p className="text-muted-foreground mt-2">
          Track your exercise progress over time
        </p>
      </div>

      <ExerciseProgressChart workouts={sortedWorkouts} />

      <PersonalRecordsCard workouts={workouts} currentYear={currentYear} />
    </div>
  );
}

interface PersonalRecordsCardProps {
  workouts: WorkoutWithExercises[];
  currentYear: number;
}

function PersonalRecordsCard({
  workouts,
  currentYear,
}: PersonalRecordsCardProps) {
  const [focusFilter, setFocusFilter] = useState<string>(ALL_FOCUSES);

  const availableFocuses = useMemo(() => {
    const byKey = new Map<string, string>();
    workouts.forEach((w) => {
      if (!w.focus) return;
      const key = normalizeFocusKey(w.focus);
      if (!key) return;
      if (!byKey.has(key)) {
        byKey.set(key, canonicalizeFocusLabel(w.focus));
      }
    });
    return Array.from(byKey.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [workouts]);

  useEffect(() => {
    if (
      focusFilter !== ALL_FOCUSES &&
      !availableFocuses.some((f) => f.key === focusFilter)
    ) {
      setFocusFilter(ALL_FOCUSES);
    }
  }, [availableFocuses, focusFilter]);

  const filteredWorkouts = useMemo(
    () =>
      focusFilter === ALL_FOCUSES
        ? workouts
        : workouts.filter((w) => normalizeFocusKey(w.focus) === focusFilter),
    [workouts, focusFilter]
  );

  const activeFocusLabel = useMemo(
    () =>
      focusFilter === ALL_FOCUSES
        ? null
        : availableFocuses.find((f) => f.key === focusFilter)?.label ?? null,
    [availableFocuses, focusFilter]
  );

  const prs = useMemo(
    () => getExercisePRs(filteredWorkouts, currentYear),
    [filteredWorkouts, currentYear]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, ExercisePR[]>();
    prs.forEach((pr) => {
      const key = pr.muscleGroup || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(pr);
    });
    return Array.from(map.entries());
  }, [prs]);

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Personal Records</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Your best lifts per exercise, all-time and year-to-date
          </p>
        </div>
        <div className="w-full sm:w-60">
          <label
            htmlFor="pr-focus-filter"
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            Workout type
          </label>
          <Select
            id="pr-focus-filter"
            className="mt-1"
            value={focusFilter}
            onChange={(e) => setFocusFilter(e.target.value)}
          >
            <option value={ALL_FOCUSES}>All workout types</option>
            {availableFocuses.map((focus) => (
              <option key={focus.key} value={focus.key}>
                {focus.label}
              </option>
            ))}
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {prs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {focusFilter === ALL_FOCUSES
              ? "No personal records to show yet."
              : `No personal records for ${activeFocusLabel ?? "this"} workouts yet.`}
          </p>
        ) : (
          <div className="space-y-6">
            {grouped.map(([groupName, groupPrs]) => (
              <div key={groupName} className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {groupName}
                </h3>
                <div className="space-y-2">
                  {groupPrs.map((pr) => (
                    <div
                      key={pr.exercise}
                      className="border rounded-lg p-3 sm:p-4"
                    >
                      <p className="font-semibold">{pr.exercise}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        <PRStat label="All-time" entry={pr.allTime} />
                        <PRStat
                          label={`YTD (${currentYear})`}
                          entry={pr.ytd}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatSecondsAsDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const mm = minutes.toString().padStart(hours > 0 ? 2 : 1, "0");
  const ss = seconds.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Trim trailing zero for common cases (e.g. 3.0 → 3, 3.25 → 3.25). */
function formatDistance(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toString();
}

function formatPacePerMile(timeSec: number, distanceMi: number): string | null {
  if (distanceMi <= 0 || timeSec <= 0) return null;
  const secPerMile = Math.round(timeSec / distanceMi);
  return `${formatSecondsAsDuration(secPerMile)} / mi`;
}

interface PRStatContent {
  headline: React.ReactNode;
  subline?: React.ReactNode;
  ariaDescription: string;
}

function renderPRStatContent(entry: PREntry): PRStatContent {
  switch (entry.kind) {
    case "weight":
      return {
        headline: (
          <>
            {entry.weight} lbs
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              × {entry.reps} rep{entry.reps !== 1 ? "s" : ""}
            </span>
          </>
        ),
        ariaDescription: `${entry.weight} lbs × ${entry.reps} reps`,
      };
    case "session-reps":
      return {
        headline: (
          <>
            {entry.totalReps} rep{entry.totalReps !== 1 ? "s" : ""}
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              across {entry.sets} set{entry.sets !== 1 ? "s" : ""}
            </span>
          </>
        ),
        ariaDescription: `${entry.totalReps} total reps across ${entry.sets} set${
          entry.sets !== 1 ? "s" : ""
        }`,
      };
    case "running": {
      const distanceLabel = `${formatDistance(entry.distanceMi)} mi`;
      const timeLabel = formatSecondsAsDuration(entry.timeSec);
      const pace = formatPacePerMile(entry.timeSec, entry.distanceMi);
      return {
        headline: (
          <>
            {timeLabel}
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              for {distanceLabel}
            </span>
          </>
        ),
        subline: pace ? (
          <span className="text-xs text-muted-foreground">{pace}</span>
        ) : undefined,
        ariaDescription: `${timeLabel} for ${distanceLabel}${pace ? ` (${pace})` : ""}`,
      };
    }
    case "cardio-distance": {
      const distanceLabel = `${formatDistance(entry.distanceMi)} mi`;
      const timeLabel = formatSecondsAsDuration(entry.timeSec);
      return {
        headline: (
          <>
            {distanceLabel}
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              in {timeLabel}
            </span>
          </>
        ),
        ariaDescription: `${distanceLabel} in ${timeLabel}`,
      };
    }
    case "cardio-output": {
      const outputLabel = `${formatDistance(entry.outputKJ)} kJ`;
      const timeLabel = formatSecondsAsDuration(entry.timeSec);
      return {
        headline: (
          <>
            {outputLabel}
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              in {timeLabel}
            </span>
          </>
        ),
        ariaDescription: `${outputLabel} in ${timeLabel}`,
      };
    }
    case "swim": {
      const yardsLabel = `${entry.totalYards.toLocaleString()} yd`;
      const timeLabel =
        entry.timeSec > 0 ? formatSecondsAsDuration(entry.timeSec) : null;
      const setsLabel =
        entry.sets > 0 ? `${entry.sets} set${entry.sets !== 1 ? "s" : ""}` : null;
      const subParts = [setsLabel, timeLabel ? `${timeLabel} interval` : null]
        .filter(Boolean)
        .join(" · ");
      return {
        headline: (
          <>
            {yardsLabel}
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              total
            </span>
          </>
        ),
        subline: subParts ? (
          <span className="text-xs text-muted-foreground">{subParts}</span>
        ) : undefined,
        ariaDescription: `${yardsLabel} total${subParts ? ` (${subParts})` : ""}`,
      };
    }
    case "duration": {
      const timeLabel = formatSecondsAsDuration(entry.timeSec);
      return {
        headline: (
          <>
            {timeLabel}
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              total
            </span>
          </>
        ),
        ariaDescription: `${timeLabel} total time`,
      };
    }
  }
}

function PRStat({ label, entry }: { label: string; entry: PREntry | null }) {
  const labelEl = (
    <p className="text-xs text-muted-foreground uppercase tracking-wide">
      {label}
    </p>
  );

  if (!entry) {
    return (
      <div className="bg-muted/50 rounded p-3">
        {labelEl}
        <p className="text-sm text-muted-foreground mt-1">No PR yet</p>
      </div>
    );
  }

  const href = `/dashboard/history?workout=${encodeURIComponent(
    entry.workoutId
  )}&exercise=${encodeURIComponent(entry.exerciseId)}`;
  const dateLabel = format(new Date(entry.date), "MMM d, yyyy");
  const { headline, subline, ariaDescription } = renderPRStatContent(entry);
  const ariaLabel = `View ${label} PR: ${ariaDescription} on ${dateLabel}`;

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="block bg-muted/50 rounded p-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {labelEl}
      <p className="text-lg font-bold">{headline}</p>
      {subline ? <div className="mt-0.5">{subline}</div> : null}
      <p className="text-xs text-muted-foreground mt-0.5">{dateLabel}</p>
    </Link>
  );
}
