import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";

export default async function Home() {
  // Check if user is authenticated via Auth0
  const session = await auth0.getSession();

  if (session) {
    // User is logged in, redirect to dashboard
    redirect("/dashboard");
  } else {
    // User is not logged in, redirect to login page
    redirect("/login");
  }
}

