import { NextResponse } from "next/server";
import {
  authorizeWorkoutApi,
  parseInclusiveDateRange,
  queryWorkouts,
  serializeWorkout,
} from "@/lib/workout-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const unauthorized = authorizeWorkoutApi(request);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const range = parseInclusiveDateRange(
    url.searchParams.get("from"),
    url.searchParams.get("to")
  );
  if (range instanceof NextResponse) return range;

  const result = await queryWorkouts(range);
  if (result.error) return result.error;

  return NextResponse.json({
    workouts: result.workouts.map(serializeWorkout),
  });
}
