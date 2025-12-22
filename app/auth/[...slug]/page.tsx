"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Catch-all fallback for auth routes when Auth0 is not configured.
 * Redirects back to the login page.
 */
export default function AuthCatchAll() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page when Auth0 isn't configured
    router.replace("/login");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-muted-foreground">Redirecting...</div>
    </div>
  );
}
