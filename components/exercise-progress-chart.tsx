"use client";

import {
  useState,
  useMemo,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { X } from "lucide-react";
import { format, startOfMonth, startOfYear } from "date-fns";
import type { WorkoutWithExercises, WorkoutFocus } from "@/lib/types";

const REPS_KEY_PREFIX = "reps__";
const WID_PREFIX = "wid__";
const EID_PREFIX = "eid__";

function widKey(exerciseName: string): string {
  return `${WID_PREFIX}${exerciseName}`;
}

function eidKey(exerciseName: string): string {
  return `${EID_PREFIX}${exerciseName}`;
}

/** Workout that contributed the plotted max weight (and reps at that weight) for this day. */
function pickContributingWorkout(
  dateWorkouts: WorkoutWithExercises[],
  exerciseName: string,
  maxW: number,
  maxR: number
): { workoutId: string; exerciseId: string } | null {
  type Cand = { workoutId: string; exerciseId: string; created_at: string };
  const exact: Cand[] = [];
  const weightOnly: Cand[] = [];
  for (const workout of dateWorkouts) {
    for (const we of workout.workout_exercises) {
      if (!we.exercise || we.exercise.name.trim() !== exerciseName) continue;
      const nw = Number(we.weight);
      if (Number.isNaN(nw) || nw !== maxW) continue;
      const cand: Cand = {
        workoutId: workout.id,
        exerciseId: we.exercise.id,
        created_at: workout.created_at ?? workout.workout_date,
      };
      if (we.reps === maxR) exact.push(cand);
      weightOnly.push(cand);
    }
  }
  const pool = exact.length > 0 ? exact : weightOnly;
  if (pool.length === 0) return null;
  pool.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return { workoutId: pool[0].workoutId, exerciseId: pool[0].exerciseId };
}

interface ExerciseDataPoint {
  date: string;
  dateValue: Date;
  [key: string]: string | Date | number | undefined;
}

function repsFieldKey(exerciseName: string): string {
  return `${REPS_KEY_PREFIX}${exerciseName}`;
}

interface DotHoverState {
  dateLabel: string;
  exerciseName: string;
  row: ExerciseDataPoint;
  clientX: number;
  clientY: number;
}

interface SelectedChartDot {
  workoutId: string;
  exerciseId: string | null;
  exerciseName: string;
}

function parseWorkoutDate(dateString: string): Date {
  const parts = dateString.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateString);
}

function ProgressDotWorkoutModal({
  selection,
  workouts,
  onClose,
}: {
  selection: SelectedChartDot;
  workouts: WorkoutWithExercises[];
  onClose: () => void;
}) {
  const workout = workouts.find((w) => w.id === selection.workoutId);
  if (!workout) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="bg-card border rounded-xl shadow-xl w-full max-w-md p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm text-muted-foreground">Workout not found.</p>
          <Button type="button" variant="outline" className="mt-4" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  const workoutDateLabel = format(
    parseWorkoutDate(workout.workout_date),
    "EEEE, MMMM d, yyyy"
  );
  const historyHref =
    selection.exerciseId != null
      ? `/dashboard/history?workout=${encodeURIComponent(workout.id)}&exercise=${encodeURIComponent(selection.exerciseId)}`
      : `/dashboard/history?workout=${encodeURIComponent(workout.id)}`;

  const isBodyWeight = selection.exerciseName === BODY_WEIGHT_METRIC;
  const exerciseRows = isBodyWeight
    ? []
    : workout.workout_exercises
        .filter((we) => {
          if (!we.exercise) return false;
          if (selection.exerciseId) return we.exercise.id === selection.exerciseId;
          return we.exercise.name.trim() === selection.exerciseName;
        })
        .sort((a, b) => a.set_number - b.set_number);

  const isPullups = selection.exerciseName === "Pull-ups";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border rounded-xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-4 border-b">
          <div>
            <h3 className="font-semibold text-lg">{selection.exerciseName}</h3>
            <p className="text-sm text-muted-foreground mt-1">{workoutDateLabel}</p>
            <p className="text-sm text-muted-foreground">{workout.focus}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 space-y-4">
          {isBodyWeight ? (
            <p className="text-sm">
              <span className="font-medium">Body weight:</span>{" "}
              {workout.body_weight != null && Number(workout.body_weight) > 0
                ? `${workout.body_weight} lbs`
                : "—"}
            </p>
          ) : exerciseRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sets logged for this exercise.</p>
          ) : (
            <div className="bg-muted/30 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                      Set
                    </th>
                    {!isPullups ? (
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                        Weight (lbs)
                      </th>
                    ) : null}
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                      Reps
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {exerciseRows.map((set, j) => (
                    <tr
                      key={set.set_number}
                      className={
                        j < exerciseRows.length - 1 ? "border-b border-border/30" : ""
                      }
                    >
                      <td className="py-1.5 px-3">{set.set_number}</td>
                      {!isPullups ? <td className="py-1.5 px-3">{set.weight}</td> : null}
                      <td className="py-1.5 px-3">{set.reps}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link href={historyHref}>
            <Button type="button" className="w-full">
              View full workout
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function SingleExerciseTooltipCard({
  dateLabel,
  exerciseName,
  row,
}: {
  dateLabel: string;
  exerciseName: string;
  row: ExerciseDataPoint;
}) {
  const weight = row[exerciseName];
  if (typeof weight !== "number" || Number.isNaN(weight)) return null;
  const repsRaw = row[repsFieldKey(exerciseName)];
  const reps =
    typeof repsRaw === "number" && !Number.isNaN(repsRaw) ? repsRaw : null;

  return (
    <div className="rounded-md border border-border bg-background px-3 py-2 text-sm shadow-md max-w-xs">
      <p className="font-medium text-foreground">{dateLabel}</p>
      <div className="mt-1 space-y-0.5">
        <div>
          <span className="font-bold text-foreground">{exerciseName}</span>
          <span className="text-muted-foreground">: {weight} lbs</span>
        </div>
        {reps != null ? (
          <div>
            <span className="font-bold text-foreground">Max Reps:</span>
            <span className="text-muted-foreground"> {reps} reps</span>
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Click the dot for workout details</p>
    </div>
  );
}

/** Recharts LineChart only supports axis-level tooltips; use hit targets on each dot instead. */
function LineExerciseDot({
  cx,
  cy,
  payload,
  value,
  exerciseName,
  strokeColor,
  setDotHover,
  onSelectWorkout,
}: {
  cx?: number;
  cy?: number;
  payload?: ExerciseDataPoint;
  value?: number | string;
  exerciseName: string;
  strokeColor: string;
  setDotHover: Dispatch<SetStateAction<DotHoverState | null>>;
  onSelectWorkout: (selection: SelectedChartDot) => void;
}) {
  if (cx == null || cy == null || !payload) return null;
  if (typeof value !== "number" || Number.isNaN(value)) return null;

  const dateLabel = payload.date;
  if (typeof dateLabel !== "string") return null;

  const matchesHover = (prev: DotHoverState | null): prev is DotHoverState =>
    prev !== null &&
    prev.exerciseName === exerciseName &&
    prev.dateLabel === dateLabel;

  const openWorkoutDetails = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const wid = payload[widKey(exerciseName)];
    const eid = payload[eidKey(exerciseName)];
    if (typeof wid !== "string" || !wid) return;
    onSelectWorkout({
      workoutId: wid,
      exerciseId: typeof eid === "string" && eid ? eid : null,
      exerciseName,
    });
  };

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={16}
        fill="transparent"
        style={{ cursor: "pointer" }}
        onClick={openWorkoutDetails}
        onMouseEnter={(e) =>
          setDotHover({
            dateLabel,
            exerciseName,
            row: payload,
            clientX: e.clientX,
            clientY: e.clientY,
          })
        }
        onMouseMove={(e) =>
          setDotHover((prev) => {
            if (!matchesHover(prev)) return prev;
            return {
              dateLabel: prev.dateLabel,
              exerciseName: prev.exerciseName,
              row: prev.row,
              clientX: e.clientX,
              clientY: e.clientY,
            };
          })
        }
        onMouseLeave={() =>
          setDotHover((prev) => (matchesHover(prev) ? null : prev))
        }
      />
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={strokeColor}
        stroke="#fff"
        strokeWidth={1}
        style={{ pointerEvents: "none" }}
      />
    </g>
  );
}

interface ExerciseProgressChartProps {
  workouts: WorkoutWithExercises[];
}

const WORKOUT_FOCUS_OPTIONS: WorkoutFocus[] = [
  "Chest / Shoulders / Triceps",
  "Back / Biceps",
  "Legs",
  "Full Body",
  "Cardio",
  "Other",
];

/**
 * Virtual "exercise" name used to plot the user's manually-logged body weight
 * on the progress chart. Not a real Exercise row — body weight is stored
 * directly on each workout as `body_weight`.
 */
const BODY_WEIGHT_METRIC = "Body Weight";

type WorkoutTypePreset = WorkoutFocus | typeof BODY_WEIGHT_METRIC | "";

const FOCUS_TO_MUSCLE_GROUPS: Record<WorkoutFocus, readonly string[]> = {
  "Chest / Shoulders / Triceps": ["Chest", "Shoulders", "Triceps"],
  "Back / Biceps": ["Back", "Biceps"],
  Legs: ["Legs"],
  "Full Body": [
    "Chest",
    "Triceps",
    "Shoulders",
    "Back",
    "Biceps",
    "Legs",
    "Core",
    "Cardio",
  ],
  Cardio: ["Cardio"],
  Other: ["Core"],
};

function exerciseNamesForWorkoutFocus(
  focus: WorkoutFocus,
  allNames: string[],
  nameToMuscleGroup: Map<string, string>,
  workoutList: WorkoutWithExercises[]
): string[] {
  if (focus === "Full Body") {
    return [...allNames];
  }

  const allowedMuscleGroups = new Set(FOCUS_TO_MUSCLE_GROUPS[focus]);
  const namesLoggedUnderThisFocus = new Set<string>();
  for (const w of workoutList) {
    if (w.focus !== focus) continue;
    for (const we of w.workout_exercises) {
      if (we.exercise?.name) {
        namesLoggedUnderThisFocus.add(we.exercise.name.trim());
      }
    }
  }

  return allNames.filter((name) => {
    const group = nameToMuscleGroup.get(name);
    if (group && allowedMuscleGroups.has(group)) return true;
    if (namesLoggedUnderThisFocus.has(name)) return true;
    return false;
  });
}

type TimeView = "daily" | "monthly" | "ytd";

export function ExerciseProgressChart({ workouts }: ExerciseProgressChartProps) {
  // Get all unique exercises from workouts
  const allExercises = useMemo(() => {
    const exerciseSet = new Set<string>();
    workouts.forEach((workout) => {
      workout.workout_exercises.forEach((we) => {
        if (we.exercise) {
          // Normalize exercise name (trim whitespace)
          const exerciseName = we.exercise.name.trim();
          if (exerciseName) {
            exerciseSet.add(exerciseName);
          }
        }
      });
    });
    return Array.from(exerciseSet).sort();
  }, [workouts]);

  // Track which exercises are selected. Starts empty; populated once the user
  // picks a workout focus from the dropdown below.
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());

  // Track time view selection
  const [timeView, setTimeView] = useState<TimeView>("daily");

  const [dotHover, setDotHover] = useState<DotHoverState | null>(null);
  const [selectedChartDot, setSelectedChartDot] =
    useState<SelectedChartDot | null>(null);

  const exerciseNameToMuscleGroup = useMemo(() => {
    const map = new Map<string, string>();
    workouts.forEach((w) => {
      w.workout_exercises.forEach((we) => {
        if (!we.exercise?.name) return;
        const n = we.exercise.name.trim();
        const g = we.exercise.muscle_group?.name?.trim();
        if (g) map.set(n, g);
      });
    });
    return map;
  }, [workouts]);

  const [workoutTypePreset, setWorkoutTypePreset] =
    useState<WorkoutTypePreset>("");

  // Exercises that belong to the currently-selected workout focus. Used both
  // to seed the selection when the focus changes and to scope the button strip
  // so users never see exercises from other focuses.
  const focusExerciseNames = useMemo(() => {
    if (!workoutTypePreset) return [] as string[];
    if (workoutTypePreset === BODY_WEIGHT_METRIC) return [BODY_WEIGHT_METRIC];
    return exerciseNamesForWorkoutFocus(
      workoutTypePreset,
      allExercises,
      exerciseNameToMuscleGroup,
      workouts
    );
  }, [workoutTypePreset, allExercises, exerciseNameToMuscleGroup, workouts]);

  useEffect(() => {
    if (!workoutTypePreset) return;
    // Always replace the selection with exactly the focus's exercises. This
    // ensures nothing from a prior focus (Core, Lateral Raises, etc.) ever
    // stays selected when the user switches to e.g. Chest / Shoulders /
    // Triceps.
    setSelectedExercises(new Set(focusExerciseNames));
  }, [workoutTypePreset, focusExerciseNames]);

  // Transform workouts into chart data based on selected time view
  // Each workout date becomes a data point (workouts on same date are aggregated)
  const chartData = useMemo(() => {
    if (workouts.length === 0) return [];

    // Filter workouts based on time view
    let filteredWorkouts = workouts;
    const now = new Date();
    now.setHours(23, 59, 59, 999); // End of today
    
    // Always filter out future dates
    filteredWorkouts = workouts.filter((workout) => {
      const workoutDate = parseWorkoutDate(workout.workout_date);
      return workoutDate <= now;
    });
    
    if (timeView === "ytd") {
      const yearStart = startOfYear(now);
      yearStart.setHours(0, 0, 0, 0);
      filteredWorkouts = filteredWorkouts.filter((workout) => {
        const workoutDate = parseWorkoutDate(workout.workout_date);
        return workoutDate >= yearStart;
      });
    } else if (timeView === "monthly") {
      // For monthly view, show last 6 months of workouts
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      sixMonthsAgo.setHours(0, 0, 0, 0);
      filteredWorkouts = filteredWorkouts.filter((workout) => {
        const workoutDate = parseWorkoutDate(workout.workout_date);
        return workoutDate >= sixMonthsAgo;
      });
    }

    // Group workouts by date (multiple workouts on same date are aggregated)
    const workoutsByDate = new Map<string, WorkoutWithExercises[]>();
    
    filteredWorkouts.forEach((workout) => {
      const dateKey = workout.workout_date;
      if (!workoutsByDate.has(dateKey)) {
        workoutsByDate.set(dateKey, []);
      }
      workoutsByDate.get(dateKey)!.push(workout);
    });

    // Create a data point for each workout date
    const dataPoints: ExerciseDataPoint[] = [];
    
    workoutsByDate.forEach((dateWorkouts, dateKey) => {
      const exerciseMaxWeights: Record<string, number> = {};
      const exerciseRepsAtMaxWeight: Record<string, number> = {};

      // Aggregate all workouts on this date
      dateWorkouts.forEach((workout) => {
        workout.workout_exercises.forEach((we) => {
          if (!we.exercise) return;

          // Normalize exercise name (trim whitespace)
          const exerciseName = we.exercise.name.trim();

          // Only process selected exercises
          if (!selectedExercises.has(exerciseName)) return;

          const w = Number(we.weight);
          const r = we.reps;
          if (Number.isNaN(w) || Number.isNaN(r)) return;

          const currentMax = exerciseMaxWeights[exerciseName];
          if (currentMax === undefined || w > currentMax) {
            exerciseMaxWeights[exerciseName] = w;
            exerciseRepsAtMaxWeight[exerciseName] = r;
          } else if (w === currentMax) {
            exerciseRepsAtMaxWeight[exerciseName] = Math.max(
              exerciseRepsAtMaxWeight[exerciseName] ?? 0,
              r
            );
          }
        });
      });

      // Body weight is a per-workout field (not a workout_exercise row). When
      // selected, roll up the highest body_weight reported on this date so a
      // day with multiple workouts still produces a single data point.
      let bodyWeightForDay: number | undefined;
      let bodyWeightWorkoutId: string | undefined;
      if (selectedExercises.has(BODY_WEIGHT_METRIC)) {
        dateWorkouts.forEach((workout) => {
          const bw = Number(workout.body_weight);
          if (!Number.isFinite(bw) || bw <= 0) return;
          if (bodyWeightForDay === undefined || bw > bodyWeightForDay) {
            bodyWeightForDay = bw;
            bodyWeightWorkoutId = workout.id;
          }
        });
      }

      // Only create a data point if at least one selected metric has data.
      const hasExerciseData = Array.from(selectedExercises).some(
        (name) =>
          name !== BODY_WEIGHT_METRIC && exerciseMaxWeights[name] !== undefined
      );
      const hasBodyWeightData = bodyWeightForDay !== undefined;
      if (!hasExerciseData && !hasBodyWeightData) return;

      const dateValue = parseWorkoutDate(dateKey);
      
      // Format date based on time view
      let dateLabel: string;
      if (timeView === "monthly") {
        // For monthly view, show numeric month/day (e.g. 12/20)
        dateLabel = format(dateValue, "M/d");
      } else {
        // For daily and YTD views, show numeric date (e.g. 12/20/25)
        dateLabel = format(dateValue, "M/d/yy");
      }
      
      const dataPoint: ExerciseDataPoint = {
        date: dateLabel,
        dateValue,
      };

      // Add max weight, reps at that weight, and contributing workout for each selected exercise
      selectedExercises.forEach((exerciseName) => {
        if (exerciseName === BODY_WEIGHT_METRIC) {
          dataPoint[BODY_WEIGHT_METRIC] = bodyWeightForDay;
          if (bodyWeightWorkoutId) {
            dataPoint[widKey(BODY_WEIGHT_METRIC)] = bodyWeightWorkoutId;
          }
          return;
        }
        const w = exerciseMaxWeights[exerciseName];
        dataPoint[exerciseName] = w;
        dataPoint[repsFieldKey(exerciseName)] =
          w !== undefined ? exerciseRepsAtMaxWeight[exerciseName] : undefined;
        if (w !== undefined) {
          const maxR = exerciseRepsAtMaxWeight[exerciseName] ?? 0;
          const picked = pickContributingWorkout(
            dateWorkouts,
            exerciseName,
            w,
            maxR
          );
          if (picked) {
            dataPoint[widKey(exerciseName)] = picked.workoutId;
            dataPoint[eidKey(exerciseName)] = picked.exerciseId;
          }
        }
      });

      dataPoints.push(dataPoint);
    });

    // Sort by date
    return dataPoints.sort((a, b) => a.dateValue.getTime() - b.dateValue.getTime());
  }, [workouts, allExercises, timeView, selectedExercises]);

  const toggleExercise = (exerciseName: string) => {
    setSelectedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseName)) {
        next.delete(exerciseName);
      } else {
        next.add(exerciseName);
      }
      return next;
    });
  };

  const selectAll = () => {
    // Only (re)select exercises that belong to the current focus, so the
    // button strip and chart never surface unrelated workouts.
    setSelectedExercises(new Set(focusExerciseNames));
  };

  const deselectAll = () => {
    setSelectedExercises(new Set());
  };

  // Generate colors for exercises
  const colors = [
    "#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00",
    "#0088fe", "#00c49f", "#ffbb28", "#ff8042", "#8884d8",
    "#82ca9d", "#ffc658", "#ff7300", "#00ff00", "#0088fe",
  ];

  // When a focus is active, limit rendered lines/buttons to the focus's
  // exercises. When in manual mode, fall back to every selected exercise.
  const visibleSelectedExercises = workoutTypePreset
    ? focusExerciseNames.filter((name) => selectedExercises.has(name))
    : Array.from(selectedExercises);
  const selectedExercisesArray = visibleSelectedExercises;

  // Zoom the Y axis into the range the data actually occupies instead of
  // always anchoring at 0. e.g. body weight fluctuating 150–200 should not
  // waste half the chart showing 0–100.
  const yDomain = useMemo<[number | "auto", number | "auto"]>(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const row of chartData) {
      for (const exerciseName of selectedExercisesArray) {
        const value = row[exerciseName];
        if (typeof value === "number" && !Number.isNaN(value)) {
          if (value < min) min = value;
          if (value > max) max = value;
        }
      }
    }

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return [0, "auto"];
    }

    // Keep a from-zero baseline when the spread already starts near zero,
    // since that's the more honest framing for small numbers.
    if (min <= max * 0.15) {
      return [0, "auto"];
    }

    const range = max - min || Math.max(max * 0.1, 1);
    const padding = range * 0.15;
    const lower = Math.max(0, Math.floor((min - padding) / 5) * 5);
    const upper = Math.ceil((max + padding) / 5) * 5;
    return [lower, upper];
  }, [chartData, selectedExercisesArray]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Exercise Progress Over Time</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Select exercises to view their progress. Each workout you log appears as a data point showing the maximum weight lifted for that workout date.
          </p>
        </CardHeader>
        <CardContent>
          {/* Time View Selection */}
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Time View:</span>
              <Button
                variant={timeView === "daily" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeView("daily")}
                className="text-xs"
              >
                Daily
              </Button>
              <Button
                variant={timeView === "monthly" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeView("monthly")}
                className="text-xs"
              >
                Monthly
              </Button>
              <Button
                variant={timeView === "ytd" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeView("ytd")}
                className="text-xs"
              >
                Year-to-Date
              </Button>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-sm font-medium shrink-0">Workout Type:</span>
            <Select
              className="w-full max-w-md sm:w-80"
              value={workoutTypePreset}
              onChange={(e) =>
                setWorkoutTypePreset(
                  (e.target.value as WorkoutTypePreset) || ""
                )
              }
              aria-label="Filter exercises by workout type"
            >
              <option value="">Manual selection…</option>
              <optgroup label="Workout focus">
                {WORKOUT_FOCUS_OPTIONS.map((focus) => (
                  <option key={focus} value={focus}>
                    {focus}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Other metrics">
                <option value={BODY_WEIGHT_METRIC}>{BODY_WEIGHT_METRIC}</option>
              </optgroup>
            </Select>
          </div>

          {/* Exercise Selection — only visible once a workout focus is picked */}
          {workoutTypePreset ? (
            <div className="mb-6 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  className="text-xs"
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAll}
                  className="text-xs"
                >
                  Deselect All
                </Button>
                <div className="w-px h-6 bg-border mx-2" />
                {focusExerciseNames.map((exerciseName, index) => {
                  const isSelected = selectedExercises.has(exerciseName);
                  const color = colors[index % colors.length];
                  return (
                    <Button
                      key={exerciseName}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleExercise(exerciseName)}
                      className={
                        isSelected
                          ? "text-xs"
                          : "text-xs opacity-60 hover:opacity-100"
                      }
                      style={
                        isSelected
                          ? { backgroundColor: color, borderColor: color }
                          : undefined
                      }
                      aria-pressed={isSelected}
                      title={
                        isSelected
                          ? `Hide ${exerciseName} from chart`
                          : `Show ${exerciseName} on chart`
                      }
                    >
                      {exerciseName}
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Chart */}
          {selectedExercisesArray.length > 0 ? (
            <div className="w-full h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    angle={timeView === "daily" || timeView === "ytd" ? -45 : -45}
                    textAnchor="end"
                    height={80}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={yDomain}
                    allowDecimals={false}
                    label={{ value: "Weight (lbs)", angle: -90, position: "insideLeft" }}
                  />
                  <Legend />
                  {selectedExercisesArray.map((exerciseName, index) => {
                    const strokeColor = colors[index % colors.length];
                    return (
                      <Line
                        key={exerciseName}
                        type="monotone"
                        dataKey={exerciseName}
                        stroke={strokeColor}
                        strokeWidth={2}
                        dot={(dotProps) => (
                          <LineExerciseDot
                            {...dotProps}
                            exerciseName={exerciseName}
                            strokeColor={strokeColor}
                            setDotHover={setDotHover}
                            onSelectWorkout={(selection) => {
                              setDotHover(null);
                              setSelectedChartDot(selection);
                            }}
                          />
                        )}
                        activeDot={false}
                        name={exerciseName}
                        connectNulls={true}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
              {typeof document !== "undefined" &&
                dotHover &&
                createPortal(
                  <div
                    className="pointer-events-none fixed z-[100]"
                    style={{
                      left: dotHover.clientX + 12,
                      top: dotHover.clientY + 12,
                    }}
                  >
                    <SingleExerciseTooltipCard
                      dateLabel={dotHover.dateLabel}
                      exerciseName={dotHover.exerciseName}
                      row={dotHover.row}
                    />
                  </div>,
                  document.body
                )}
              {typeof document !== "undefined" &&
                selectedChartDot &&
                createPortal(
                  <ProgressDotWorkoutModal
                    selection={selectedChartDot}
                    workouts={workouts}
                    onClose={() => setSelectedChartDot(null)}
                  />,
                  document.body
                )}
            </div>
          ) : (
            <div className="h-[500px] flex items-center justify-center text-muted-foreground text-center px-4">
              {workoutTypePreset
                ? "Select at least one exercise to view progress"
                : "Pick a workout type above to choose exercises and view progress"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
