"use client";

/**
 * Shows a warning when the app is running without Supabase configured.
 * The server uses a mock client when NEXT_PUBLIC_SUPABASE_URL or
 * SUPABASE_SERVICE_ROLE_KEY are missing, so no data is persisted.
 */
export function DbStatusBanner({ isMockMode }: { isMockMode: boolean }) {
  if (!isMockMode) return null;

  return (
    <div
      className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
      role="status"
    >
      <p className="font-medium">Database not connected</p>
      <p className="mt-1 text-amber-700 dark:text-amber-300/90">
        Add <code className="rounded bg-amber-500/20 px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="rounded bg-amber-500/20 px-1">SUPABASE_SERVICE_ROLE_KEY</code> to your
        environment (e.g. <code className="rounded bg-amber-500/20 px-1">.env.local</code> or Vercel)
        so workouts are saved to Supabase. Right now data is only stored in this browser.
      </p>
    </div>
  );
}
