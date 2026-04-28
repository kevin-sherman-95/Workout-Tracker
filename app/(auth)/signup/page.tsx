"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  // Render the sign-up UI immediately rather than gating on the auth probe —
  // /signup is a public page and should never be stuck behind a "Loading..."
  // state if the probe stalls (e.g. after the Auth0 logout redirect chain).
  // If the probe resolves to an authed user, the effect above redirects.
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <CardDescription>
            Start tracking your workouts today
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <a href="/auth/login?screen_hint=signup&returnTo=/dashboard" className="block">
            <Button className="w-full" size="lg">
              Sign Up
            </Button>
          </a>
          <p className="text-center text-sm text-muted-foreground">
            Sign up with Google or create an account with email
          </p>
          <div className="text-center text-sm">
            Already have an account?{" "}
            <a href="/login" className="text-primary hover:underline">
              Sign in
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
