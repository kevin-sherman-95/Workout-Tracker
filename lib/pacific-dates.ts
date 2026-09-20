/**
 * Calendar-date helpers for America/Los_Angeles.
 *
 * Workout `workout_date` is stored as YYYY-MM-DD (the day Kevin trained), not a
 * UTC instant. Compare those strings with Pacific "today" so YTD / week / month
 * math does not shift at UTC midnight.
 */

import { todayInPacific } from "@/lib/utils";

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse YYYY-MM-DD as a UTC calendar date (no local TZ shift). */
export function parseIsoCalendarDate(isoDate: string): Date | null {
  const match = ISO_DATE_RE.exec(isoDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function formatIsoCalendarDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Add (or subtract) whole calendar days from a YYYY-MM-DD string. */
export function addDaysToIsoDate(isoDate: string, days: number): string | null {
  const date = parseIsoCalendarDate(isoDate);
  if (!date) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return formatIsoCalendarDate(date);
}

/** Monday of the ISO week containing `isoDate` (YYYY-MM-DD). */
export function getIsoWeekStartMonday(isoDate: string): string | null {
  const date = parseIsoCalendarDate(isoDate);
  if (!date) return null;
  const dow = date.getUTCDay(); // 0 Sun … 6 Sat
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  date.setUTCDate(date.getUTCDate() - daysFromMonday);
  return formatIsoCalendarDate(date);
}

export function getIsoMonthStart(isoDate: string): string | null {
  if (!ISO_DATE_RE.test(isoDate)) return null;
  return `${isoDate.slice(0, 7)}-01`;
}

export function getIsoYearStart(isoDate: string): string | null {
  if (!ISO_DATE_RE.test(isoDate)) return null;
  return `${isoDate.slice(0, 4)}-01-01`;
}

/** Pacific-today bounds used by dashboard YTD / week / month counts. */
export function getPacificPeriodBounds(now: Date = new Date()): {
  today: string;
  ytdStart: string;
  weekStart: string;
  monthStart: string;
} {
  const today = todayInPacific(now);
  return {
    today,
    ytdStart: getIsoYearStart(today) ?? `${today.slice(0, 4)}-01-01`,
    weekStart: getIsoWeekStartMonday(today) ?? today,
    monthStart: getIsoMonthStart(today) ?? `${today.slice(0, 7)}-01`,
  };
}
