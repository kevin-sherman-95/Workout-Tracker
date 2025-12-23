import { getSupabaseWithUser } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressChart } from "@/components/progress-chart";
import { format, startOfWeek, startOfMonth, subWeeks, subMonths, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";
import type { WorkoutWithExercises } from "@/lib/types";

async function getWorkouts() {
  const { supabase, userId } = await getSupabaseWithUser();
  
  try {
    // Only fetch workouts if we have a valid user
    if (!userId) {
      return null;
    }
    
    const { data: workouts } = await supabase
      .from("workouts")
      .select(`
        *,
        workout_exercises (
          *,
          exercise:exercises (*)
        )
      `)
      .eq("user_id", userId)
      .order("workout_date", { ascending: true });

    return workouts as WorkoutWithExercises[] | null;
  } catch (error) {
    // Supabase not configured, return empty for testing
    return null;
  }
}

function calculateVolume(workout: WorkoutWithExercises): number {
  return workout.workout_exercises.reduce((total, we) => {
    return total + we.reps * we.weight;
  }, 0);
}

function getWeekData(workouts: WorkoutWithExercises[]) {
  const now = new Date();
  const twelveWeeksAgo = subWeeks(now, 12);
  const weeks = eachWeekOfInterval({
    start: twelveWeeksAgo,
    end: now,
  });

  const weekData = weeks.map((weekStart) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekWorkouts = workouts.filter((w) => {
      const workoutDate = new Date(w.workout_date);
      return workoutDate >= weekStart && workoutDate <= weekEnd;
    });

    const totalVolume = weekWorkouts.reduce((sum, w) => sum + calculateVolume(w), 0);
    const workoutCount = weekWorkouts.length;

    return {
      date: format(weekStart, "MMM d"),
      volume: totalVolume,
      workouts: workoutCount,
    };
  });

  return weekData;
}

function getMonthData(workouts: WorkoutWithExercises[]) {
  const now = new Date();
  const sixMonthsAgo = startOfMonth(subMonths(now, 6));
  const months = eachMonthOfInterval({
    start: sixMonthsAgo,
    end: now,
  });

  const monthData = months.map((monthStart) => {
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(monthEnd.getDate() - 1);

    const monthWorkouts = workouts.filter((w) => {
      const workoutDate = new Date(w.workout_date);
      return workoutDate >= monthStart && workoutDate <= monthEnd;
    });

    const totalVolume = monthWorkouts.reduce((sum, w) => sum + calculateVolume(w), 0);
    const workoutCount = monthWorkouts.length;

    return {
      date: format(monthStart, "MMM yyyy"),
      volume: totalVolume,
      workouts: workoutCount,
    };
  });

  return monthData;
}

function getPersonalRecords(workouts: WorkoutWithExercises[]) {
  const prs: Record<
    string,
    { exercise: string; reps: number; weight: number; date: string }
  > = {};

  workouts.forEach((workout) => {
    workout.workout_exercises.forEach((we) => {
      if (!we.exercise) return;
      const exerciseName = we.exercise.name;
      const key = `${exerciseName}-${we.reps}`;

      if (!prs[key] || we.weight > prs[key].weight) {
        prs[key] = {
          exercise: exerciseName,
          reps: we.reps,
          weight: we.weight,
          date: workout.workout_date,
        };
      }
    });
  });

  return Object.values(prs).sort((a, b) => b.weight - a.weight).slice(0, 10);
}

export default async function ProgressPage() {
  const workouts = await getWorkouts();

  if (!workouts || workouts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Progress</h1>
          <p className="text-muted-foreground mt-2">
            Track your progress over time
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

  const weekData = getWeekData(workouts);
  const monthData = getMonthData(workouts);
  const personalRecords = getPersonalRecords(workouts);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Progress</h1>
        <p className="text-muted-foreground mt-2">
          Track your progress over time
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Volume (Last 12 Weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressChart
              data={weekData}
              type="line"
              dataKey="volume"
              title="Total Volume (lbs)"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Workouts (Last 12 Weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressChart
              data={weekData}
              type="bar"
              dataKey="workouts"
              title="Number of Workouts"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Volume (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressChart
              data={monthData}
              type="line"
              dataKey="volume"
              title="Total Volume (lbs)"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Workouts (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressChart
              data={monthData}
              type="bar"
              dataKey="workouts"
              title="Number of Workouts"
            />
          </CardContent>
        </Card>
      </div>

      {personalRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Personal Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {personalRecords.map((pr, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium">
                      {pr.exercise} - {pr.reps} reps
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(pr.date), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="text-lg font-bold">{pr.weight} lbs</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

