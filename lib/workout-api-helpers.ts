import { timingSafeEqual } from "crypto";

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

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
