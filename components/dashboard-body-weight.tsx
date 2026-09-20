"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale } from "lucide-react";
import {
  BODY_WEIGHT_TARGET_LB,
  collectBodyWeightReadings,
  summarizeBodyWeight,
  type BodyWeightSummary,
} from "@/lib/body-weight";
import { todayInPacific } from "@/lib/utils";

interface DashboardBodyWeightProps {
  serverWorkouts: Array<{
    workout_date?: string | null;
    body_weight?: number | string | null;
    created_at?: string | null;
    user_id?: string;
  }> | null;
}

function formatDelta(delta: number | null): string {
  if (delta == null) return "—";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta} lb`;
}

function formatPounds(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

export function DashboardBodyWeight({
  serverWorkouts,
}: DashboardBodyWeightProps) {
  const [summary, setSummary] = useState<BodyWeightSummary>(() =>
    summarizeBodyWeight(
      collectBodyWeightReadings(serverWorkouts ?? []),
      todayInPacific(),
      BODY_WEIGHT_TARGET_LB
    )
  );

  useEffect(() => {
    const update = () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const isMockMode =
        !supabaseUrl ||
        supabaseUrl.includes("placeholder") ||
        supabaseUrl.includes("your-project") ||
        supabaseUrl === "your_supabase_url" ||
        !supabaseUrl.startsWith("http");

      let workouts = serverWorkouts ?? [];
      if (isMockMode && typeof window !== "undefined") {
        const mockWorkouts = JSON.parse(
          localStorage.getItem("mock-workouts") || "[]"
        );
        const mockUser = JSON.parse(
          sessionStorage.getItem("mock-user") || "null"
        );
        workouts = mockUser
          ? mockWorkouts.filter((w: { user_id?: string }) => w.user_id === mockUser.id)
          : mockWorkouts;
      }

      setSummary(
        summarizeBodyWeight(
          collectBodyWeightReadings(workouts),
          todayInPacific(),
          BODY_WEIGHT_TARGET_LB
        )
      );
    };

    update();

    if (typeof window === "undefined") return;
    window.addEventListener("storage", update);
    window.addEventListener("workoutUpdated", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("workoutUpdated", update);
    };
  }, [serverWorkouts]);

  const latestLabel = summary.latest
    ? `${formatPounds(summary.latest.pounds)} lb`
    : "—";

  return (
    <Link
      href="/dashboard/progress"
      className="block rounded-lg transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="h-full cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Body weight</CardTitle>
          <Scale className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{latestLabel}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.latest
              ? `Latest ${summary.latest.date} · target ${summary.targetLb} lb`
              : `Target ${summary.targetLb} lb`}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Δ7d {formatDelta(summary.delta7d)}</span>
            <span>Δ30d {formatDelta(summary.delta30d)}</span>
            {summary.weeklyAvg != null ? (
              <span>7d avg {formatPounds(summary.weeklyAvg)} lb</span>
            ) : null}
            {summary.toTarget != null ? (
              <span>
                {summary.toTarget === 0
                  ? "At target"
                  : summary.toTarget > 0
                    ? `${formatPounds(summary.toTarget)} lb above target`
                    : `${formatPounds(Math.abs(summary.toTarget))} lb below target`}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
