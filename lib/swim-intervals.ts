/**
 * Interval-based swim logging.
 *
 * Persistence (unchanged columns, one workout_exercises row per interval):
 *   - weight          = yards per rep
 *   - rest_interval   = reps of that distance (the "1" in "1 × 100")
 *   - reps            = optional leave-on / interval clock, seconds (0 = unused)
 *
 * Total yards is always derived: sum(reps × yards). Never stored separately.
 * Legacy rows that collapsed a session to N × same-distance still decode as
 * one interval (e.g. 7 × 100 = 700 yd).
 */

export type SwimInterval = {
  /** How many of this distance (the "1" in "1 × 100"). Always ≥ 1. */
  reps: number;
  /** Yards per rep. */
  distanceYd: number;
  /** Leave-on / interval clock in seconds. Null when unused. */
  intervalSec: number | null;
};

export type SwimIntervalApiRow = SwimInterval & {
  totalDistanceYd: number;
};

export type SwimFormSet = {
  reps: number;
  weight: number;
  distance?: number;
  time?: number;
  pace?: number;
  swimSets?: number;
};

export type RawSwimRow = {
  reps?: number | null;
  weight?: number | null;
  rest_interval?: number | null;
};

export function swimIntervalReps(
  restInterval: number | null | undefined
): number {
  if (
    restInterval == null ||
    !Number.isFinite(Number(restInterval)) ||
    Number(restInterval) <= 0
  ) {
    return 1;
  }
  return Math.max(1, Math.round(Number(restInterval)));
}

export function intervalYards(interval: SwimInterval): number {
  return Math.max(0, interval.reps) * Math.max(0, interval.distanceYd);
}

export function totalSwimYards(intervals: SwimInterval[]): number {
  return intervals.reduce((sum, interval) => sum + intervalYards(interval), 0);
}

export function rawRowToSwimInterval(row: RawSwimRow): SwimInterval {
  const reps = swimIntervalReps(row.rest_interval);
  const distanceYd = Number(row.weight) || 0;
  const clock = Number(row.reps);
  return {
    reps,
    distanceYd,
    intervalSec: Number.isFinite(clock) && clock > 0 ? clock : null,
  };
}

export function swimIntervalsFromRawRows(rows: RawSwimRow[]): SwimInterval[] {
  return rows.map(rawRowToSwimInterval);
}

export function formSetToSwimInterval(set: SwimFormSet): SwimInterval {
  return {
    reps: swimIntervalReps(set.swimSets),
    distanceYd: Number(set.distance) || 0,
    intervalSec: set.time && set.time > 0 ? set.time : null,
  };
}

export function emptySwimFormSet(): SwimFormSet {
  return { reps: 0, weight: 0, distance: 100, time: 0, swimSets: 1 };
}

export function nextSwimFormSet(prev?: SwimFormSet): SwimFormSet {
  const yards = prev?.distance && prev.distance > 0 ? prev.distance : 100;
  return { reps: 0, weight: 0, distance: yards, time: 0, swimSets: 1 };
}

export function formatIntervalMmSs(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function formatSwimIntervalLine(interval: SwimInterval): string {
  const base = `${interval.reps} × ${interval.distanceYd}`;
  const clock = formatIntervalMmSs(interval.intervalSec);
  return clock ? `${base} · interval ${clock}` : base;
}

export function formatSwimSessionSummary(intervals: SwimInterval[]): string {
  const total = totalSwimYards(intervals);
  const n = intervals.length;
  const word = n === 1 ? "interval" : "intervals";
  return `Swim · ${total.toLocaleString()} yd · ${n} ${word}`;
}

export function summarizeSwimDecodedSets(
  sets: Array<{
    swimSetCount?: number | null;
    distanceYd?: number | null;
    intervalSec?: number | null;
  }>
): {
  intervals: SwimIntervalApiRow[];
  totalDistanceYd: number;
  intervalCount: number;
} {
  const intervals = sets.map((set) => {
    const reps = swimIntervalReps(set.swimSetCount);
    const distanceYd = Number(set.distanceYd) || 0;
    const intervalSec =
      set.intervalSec != null && set.intervalSec > 0 ? set.intervalSec : null;
    return {
      reps,
      distanceYd,
      intervalSec,
      totalDistanceYd: reps * distanceYd,
    };
  });
  return {
    intervals,
    totalDistanceYd: totalSwimYards(intervals),
    intervalCount: intervals.length,
  };
}

/** Yards for one persisted workout_exercises row (legacy or interval). */
export function swimYardsFromRawRow(row: RawSwimRow): number {
  return intervalYards(rawRowToSwimInterval(row));
}
