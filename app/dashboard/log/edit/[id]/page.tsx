import { WorkoutForm } from "@/components/workout-form";
import { getSession } from "@auth0/nextjs-auth0";

export default async function EditWorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  // Get Auth0 user ID for the workout form
  let userId: string | undefined;
  try {
    const session = await getSession();
    userId = session?.user?.sub;
  } catch (error) {
    console.warn("Failed to get Auth0 session:", error);
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Workout</h1>
        <p className="text-muted-foreground mt-2">
          Update your workout details, exercises, sets, and notes
        </p>
      </div>
      <WorkoutForm workoutId={id} userId={userId} />
    </div>
  );
}



