"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const { user, isLoading, error } = useUser();
  const router = useRouter();
  const [isAuth0Configured, setIsAuth0Configured] = useState(true);

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  // Check if Auth0 returned a configuration error (not just "Unauthorized" which is expected)
  useEffect(() => {
    if (error) {
      console.warn('Auth0 error:', error);
      // "Unauthorized" is expected when user is not logged in - Auth0 IS configured
      // Only set not configured for actual configuration errors
      const errorMessage = error.message?.toLowerCase() || '';
      if (!errorMessage.includes('unauthorized')) {
        setIsAuth0Configured(false);
      }
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Workout Tracker</CardTitle>
          <CardDescription>
            Sign in to track your gym workouts and progress
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isAuth0Configured ? (
            <>
              <div className="p-4 rounded-md bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium mb-2">
                  Auth0 Not Configured
                </p>
                <p className="text-xs text-muted-foreground">
                  To enable authentication, update your <code className="bg-muted px-1 rounded">.env.local</code> file with your Auth0 credentials.
                </p>
              </div>
              <a href="/dashboard" className="block">
                <Button className="w-full" variant="outline" size="lg">
                  Continue Without Auth (Dev Mode)
                </Button>
              </a>
            </>
          ) : (
            <>
              <a href="/auth/login?prompt=select_account" className="block">
                <Button className="w-full" size="lg">
                  Sign In / Sign Up
                </Button>
              </a>
              <p className="text-center text-sm text-muted-foreground">
                Sign in with Google or create an account with email
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
