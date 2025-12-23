import { WorkoutForm } from "@/components/workout-form";
import { auth0 } from "@/lib/auth0";

export default async function LogWorkoutPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const initialDate = searchParams?.date;
  
  // Get Auth0 user ID for the workout form
  let userId: string | undefined;
  try {
    if (auth0) {
      const session = await auth0.getSession();
      userId = session?.user?.sub;
    }
  } catch (error) {
    console.warn("Failed to get Auth0 session:", error);
  }
  
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

