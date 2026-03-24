import { NextResponse } from "next/server";

/**
 * Returns whether the app is using Supabase or the in-memory mock.
 * Use this to verify env vars (e.g. after setting SUPABASE_SERVICE_ROLE_KEY).
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const isValidUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const isMockMode =
    !isValidUrl(supabaseUrl) ||
    !supabaseServiceKey ||
    supabaseUrl?.includes("placeholder") ||
    supabaseUrl?.includes("your-project");

  return NextResponse.json({
    isMockMode,
    message: isMockMode
      ? "Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
      : "Using Supabase.",
  });
}
