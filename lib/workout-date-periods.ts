export type WorkoutHistoryPeriod = "week" | "month";

export function parseWorkoutLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getWeekStartLocal(reference = new Date()): Date {
  const today = new Date(reference);
  const dow = today.getDay();
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

export function getMonthStartLocal(reference = new Date()): Date {
  const monthStart = new Date(reference.getFullYear(), reference.getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);
  return monthStart;
}

export function getYtdStartLocal(reference = new Date()): Date {
  const ytdStart = new Date(reference.getFullYear(), 0, 1);
  ytdStart.setHours(0, 0, 0, 0);
  return ytdStart;
}

export function isWorkoutDateInHistoryPeriod(
  workoutDateString: string,
  period: WorkoutHistoryPeriod,
  reference = new Date()
): boolean {
  const workoutDate = parseWorkoutLocalDate(workoutDateString);
  const today = new Date(reference);
  today.setHours(23, 59, 59, 999);
  if (workoutDate > today) return false;

  const periodStart =
    period === "week"
      ? getWeekStartLocal(reference)
      : getMonthStartLocal(reference);
  return workoutDate >= periodStart;
}
