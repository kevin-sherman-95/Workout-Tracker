import { NextResponse } from "next/server";
import {
  authorizeWorkoutApi,
  getWorkoutApiRepository,
  parseInclusiveDateRange,
  parseJsonBody,
  queryWorkouts,
  serializeWorkout,
  serializedWorkoutResponse,
  workoutApiEnvelope,
} from "@/lib/workout-api";
import { executeCreateWorkout } from "@/lib/workout-api-write";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const unauthorized = authorizeWorkoutApi(request);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const range = parseInclusiveDateRange(
    url.searchParams.get("from"),
    url.searchParams.get("to"),
    url.searchParams.get("date")
  );
  if (range instanceof NextResponse) return range;

  const result = await queryWorkouts(range);
  if (result.error) return result.error;

  return NextResponse.json(
    workoutApiEnvelope({
      workouts: result.workouts.map(serializeWorkout),
    })
  );
}

export async function POST(request: Request) {
  const unauthorized = authorizeWorkoutApi(request);
  if (unauthorized) return unauthorized;

  const parsed = await parseJsonBody(request);
  if (parsed instanceof NextResponse) return parsed;

  const repo = await getWorkoutApiRepository();
  if ("error" in repo) return repo.error;

  const result = await executeCreateWorkout(
    request.headers,
    parsed.body,
    repo.repo
  );
  return serializedWorkoutResponse(result);
}
