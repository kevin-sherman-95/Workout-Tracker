import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default async function DashboardPage() {
  // Get recent workouts (will return empty if Supabase not configured)
  let workouts: any[] | null = null;
  let totalWorkouts = 0;
  
  try {
    const supabase = await createClient();
    const workoutsResult = await supabase
      .from("workouts")
      .select("id, workout_date, focus, created_at")
      .order("workout_date", { ascending: false })
      .limit(5);
    workouts = workoutsResult?.data || null;

    const countResult = await supabase
      .from("workouts")
      .select("*", { count: "exact", head: true });
    totalWorkouts = countResult?.count || 0;
  } catch (error) {
    // Supabase not configured, use empty data for testing
    workouts = null;
    totalWorkouts = 0;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back! Track your workouts and see your progress.
          </p>
        </div>
        <Link href="/dashboard/log">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Log Workout
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWorkouts || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workouts?.filter((w) => {
                const workoutDate = new Date(w.workout_date);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return workoutDate >= weekAgo;
              }).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workouts && workouts.length > 0 ? "Active" : "Get Started"}
            </div>
          </CardContent>
        </Card>
      </div>

      {workouts && workouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Workouts</CardTitle>
            <CardDescription>Your latest workout sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workouts.map((workout) => (
                <div
                  key={workout.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{workout.focus}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(workout.workout_date), "MMMM d, yyyy")}
                    </p>
                  </div>
                  <Link href={`/dashboard/history?workout=${workout.id}`}>
                    <Button variant="outline" size="sm">View</Button>
                  </Link>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link href="/dashboard/history">
                <Button variant="outline" className="w-full">
                  View All Workouts
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

