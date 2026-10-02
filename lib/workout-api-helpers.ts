import { timingSafeEqual } from "crypto";

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres uuid text form. Non-matching ids must not be sent to the database. */
export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Calendar date in YYYY-MM-DD form that is a real Gregorian date. */
export function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE_RE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function extractProvidedApiKey(headers: {
  get(name: string): string | null;
}): string | undefined {
  const authorization = headers.get("authorization");
  if (authorization) {
    const match = /^Bearer\s+(\S+)/i.exec(authorization.trim());
    if (match?.[1]) return match[1];
  }
  const apiKey = headers.get("x-api-key")?.trim();
  return apiKey || undefined;
}

export function getConfiguredWorkoutApiKey(): string | undefined {
  const key = process.env.WORKOUT_API_KEY?.trim();
  return key || undefined;
}

export function getConfiguredWorkoutApiUserId(): string | undefined {
  const userId = process.env.WORKOUT_API_USER_ID?.trim();
  return userId || undefined;
}

/** Constant-time compare; false when either side is missing or lengths differ. */
export function apiKeysMatch(
  provided: string | undefined,
  expected: string | undefined
): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isAuthorizedWorkoutApiRequest(headers: {
  get(name: string): string | null;
}): boolean {
  return apiKeysMatch(extractProvidedApiKey(headers), getConfiguredWorkoutApiKey());
}

export type WorkoutListQuery =
  | { from?: string; to?: string }
  | { error: string };

/** Inclusive from/to range, or a single `date` (same as from=to=date). */
export function parseWorkoutListQuery(
  from: string | null,
  to: string | null,
  date: string | null = null
): WorkoutListQuery {
  if (date) {
    if (from || to) {
      return { error: "Use date or from/to, not both." };
    }
    if (!isValidIsoDate(date)) {
      return { error: "Invalid date. Use YYYY-MM-DD." };
    }
    return { from: date, to: date };
  }
  if (from && !isValidIsoDate(from)) {
    return { error: "Invalid from date. Use YYYY-MM-DD." };
  }
  if (to && !isValidIsoDate(to)) {
    return { error: "Invalid to date. Use YYYY-MM-DD." };
  }
  if (from && to && from > to) {
    return { error: "from must be on or before to." };
  }
  return {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };
}
