import { getSupabaseWithUser } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { WorkoutCalendar } from "@/components/workout-calendar";
import { DashboardStats } from "@/components/dashboard-stats";

// Parse date string (YYYY-MM-DD) as local date to avoid timezone issues
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
};

export default async function DashboardPage() {
  // Get recent workouts (will return empty if Supabase not configured)
  let workouts: any[] | null = null;
  let totalWorkouts = 0;
  
  let allWorkouts: any[] | null = null;
  
  try {
    const { supabase, userId } = await getSupabaseWithUser();
    
    // Only fetch workouts if we have a valid user
    if (userId) {
      const workoutsResult = await supabase
        .from("workouts")
        .select("id, workout_date, focus, created_at")
        .eq("user_id", userId)
        .order("workout_date", { ascending: false })
        .limit(5);
      workouts = workoutsResult?.data || null;

      // Get all workouts for calendar
      const allWorkoutsResult = await supabase
        .from("workouts")
        .select("id, workout_date, focus, created_at")
        .eq("user_id", userId)
        .order("workout_date", { ascending: true });
      allWorkouts = allWorkoutsResult?.data || null;

      const countResult = await supabase
        .from("workouts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      totalWorkouts = countResult?.count || 0;
    }
  } catch (error) {
    // Supabase not configured, use empty data for testing
    workouts = null;
    allWorkouts = null;
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
        <DashboardStats 
          serverWorkouts={allWorkouts} 
          serverTotalWorkouts={totalWorkouts}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <WorkoutCalendar workouts={allWorkouts} />
        
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
                        {format(parseLocalDate(workout.workout_date), "MMMM d, yyyy")}
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

      {workouts && workouts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No workouts yet. Start logging your workouts to see them here!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
