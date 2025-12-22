"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Fallback login page shown when Auth0 is not configured.
 * When Auth0 IS configured, the middleware handles /auth/login directly
 * and this page is never rendered.
 */
export default function AuthLoginFallback() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Auth0 Not Configured</CardTitle>
          <CardDescription>
            Authentication is not set up yet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-md bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium mb-2">
              Setup Required
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              To enable authentication with Google sign-in, you need to configure Auth0:
            </p>
            <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
              <li>Create an account at <a href="https://auth0.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">auth0.com</a></li>
              <li>Create a Regular Web Application</li>
              <li>Enable Google in Authentication → Social</li>
              <li>Update <code className="bg-muted px-1 rounded">.env.local</code> with your credentials</li>
              <li>Restart the dev server</li>
            </ol>
          </div>
          
          <div className="space-y-2">
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => router.push("/dashboard")}
            >
              Continue Without Auth (Dev Mode)
            </Button>
            <Button 
              className="w-full" 
              variant="ghost"
              onClick={() => router.push("/login")}
            >
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
