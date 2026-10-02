import { NextResponse } from "next/server";
import {
  authorizeWorkoutApi,
  getWorkoutApiRepository,
  jsonFromApiResult,
  parseJsonBody,
  queryWorkouts,
  serializeWorkout,
  serializedWorkoutResponse,
  workoutApiEnvelope,
} from "@/lib/workout-api";
import {
  executeDeleteWorkout,
  executeUpdateWorkout,
} from "@/lib/workout-api-write";

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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const unauthorized = authorizeWorkoutApi(request);
  if (unauthorized) return unauthorized;

  const parsed = await parseJsonBody(request);
  if (parsed instanceof NextResponse) return parsed;

  const repo = await getWorkoutApiRepository();
  if ("error" in repo) return repo.error;

  const result = await executeUpdateWorkout(
    request.headers,
    params.id ?? "",
    parsed.body,
    repo.repo
  );
  return serializedWorkoutResponse(result);
}

export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  return PATCH(request, context);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const unauthorized = authorizeWorkoutApi(request);
  if (unauthorized) return unauthorized;

  const repo = await getWorkoutApiRepository();
  if ("error" in repo) return repo.error;

  const result = await executeDeleteWorkout(
    request.headers,
    params.id ?? "",
    repo.repo
  );
  return jsonFromApiResult(result);
}
