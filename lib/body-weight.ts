import { addDaysToIsoDate } from "@/lib/pacific-dates";

/** Kevin's cut goal. Used as the progress-chart reference line and dashboard target. */
export const BODY_WEIGHT_TARGET_LB = 180;

export const BODY_WEIGHT_UNIT = "lb" as const;

export type BodyWeightReading = {
  date: string;
  pounds: number;
};

export type BodyWeightSummary = {
  latest: BodyWeightReading | null;
  delta7d: number | null;
  delta30d: number | null;
  weeklyAvg: number | null;
  toTarget: number | null;
  targetLb: number;
};

function isPositiveWeight(value: unknown): value is number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0;
}

export function collectBodyWeightReadings(
  workouts: Array<{
    workout_date?: string | null;
    body_weight?: number | string | null;
    created_at?: string | null;
  }>
): BodyWeightReading[] {
  const rows = workouts
    .filter(
      (w) =>
        typeof w.workout_date === "string" &&
        w.workout_date.length > 0 &&
        isPositiveWeight(w.body_weight)
    )
    .map((w) => ({
      date: w.workout_date as string,
      pounds: Number(w.body_weight),
      createdAt: w.created_at ?? "",
    }));

  rows.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });

  return rows.map(({ date, pounds }) => ({ date, pounds }));
}

function readingOnOrBefore(
  readingsNewestFirst: BodyWeightReading[],
  cutoffDate: string
): BodyWeightReading | null {
  return readingsNewestFirst.find((r) => r.date <= cutoffDate) ?? null;
}

function roundTenths(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Latest body weight plus simple lookbacks.
 * Deltas are latest minus the most recent reading on or before today−N days.
 * Weekly avg is the mean of readings in [today−6, today] (Pacific calendar).
 */
export function summarizeBodyWeight(
  readingsNewestFirst: BodyWeightReading[],
  todayIso: string,
  targetLb: number = BODY_WEIGHT_TARGET_LB
): BodyWeightSummary {
  const latest = readingsNewestFirst[0] ?? null;
  const cutoff7 = addDaysToIsoDate(todayIso, -7);
  const cutoff30 = addDaysToIsoDate(todayIso, -30);
  const weekWindowStart = addDaysToIsoDate(todayIso, -6);

  const ref7 = cutoff7 ? readingOnOrBefore(readingsNewestFirst, cutoff7) : null;
  const ref30 = cutoff30
    ? readingOnOrBefore(readingsNewestFirst, cutoff30)
    : null;

  const delta7d =
    latest && ref7 && latest.date !== ref7.date
      ? roundTenths(latest.pounds - ref7.pounds)
      : null;
  const delta30d =
    latest && ref30 && latest.date !== ref30.date
      ? roundTenths(latest.pounds - ref30.pounds)
      : null;

  const weekReadings = weekWindowStart
    ? readingsNewestFirst.filter(
        (r) => r.date >= weekWindowStart && r.date <= todayIso
      )
    : [];
  const weeklyAvg =
    weekReadings.length > 0
      ? roundTenths(
          weekReadings.reduce((sum, r) => sum + r.pounds, 0) /
            weekReadings.length
        )
      : null;

  return {
    latest,
    delta7d,
    delta30d,
    weeklyAvg,
    toTarget: latest ? roundTenths(latest.pounds - targetLb) : null,
    targetLb,
  };
}
