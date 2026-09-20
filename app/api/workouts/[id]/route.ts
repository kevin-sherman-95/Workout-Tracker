import { NextResponse } from "next/server";
import {
  authorizeWorkoutApi,
  queryWorkouts,
  serializeWorkout,
  workoutApiEnvelope,
} from "@/lib/workout-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const unauthorized = authorizeWorkoutApi(request);
  if (unauthorized) return unauthorized;

  const id = params.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing workout id." }, { status: 400 });
  }

  const result = await queryWorkouts({ id });
  if (result.error) return result.error;

  const workout = result.workouts[0];
  if (!workout) {
    return NextResponse.json({ error: "Workout not found." }, { status: 404 });
  }

  return NextResponse.json(
    workoutApiEnvelope({ workout: serializeWorkout(workout) })
  );
}
