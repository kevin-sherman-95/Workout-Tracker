import { NextResponse } from "next/server";
import { todayInPacific } from "@/lib/utils";
import {
  authorizeWorkoutApi,
  queryWorkouts,
  serializeWorkout,
} from "@/lib/workout-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const unauthorized = authorizeWorkoutApi(request);
  if (unauthorized) return unauthorized;

  const today = todayInPacific();
  const result = await queryWorkouts({ from: today, to: today });
  if (result.error) return result.error;

  return NextResponse.json({
    date: today,
    workouts: result.workouts.map(serializeWorkout),
  });
}
