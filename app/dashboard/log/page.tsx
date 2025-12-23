import { WorkoutForm } from "@/components/workout-form";

export default function LogWorkoutPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const initialDate = searchParams?.date;
  
  // User ID is fetched client-side in WorkoutForm via useUser hook
  const userId = undefined;
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Log Workout</h1>
        <p className="text-muted-foreground mt-2">
          Record your exercises, sets, reps, and weights
        </p>
      </div>
      <WorkoutForm initialDate={initialDate} userId={userId} />
    </div>
  );
}

