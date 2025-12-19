import { WorkoutForm } from "@/components/workout-form";

export default async function EditWorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Workout</h1>
        <p className="text-muted-foreground mt-2">
          Update your workout details, exercises, sets, and notes
        </p>
      </div>
      <WorkoutForm workoutId={id} />
    </div>
  );
}
