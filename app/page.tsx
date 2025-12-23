import { redirect } from "next/navigation";
import { getSession } from "@auth0/nextjs-auth0";

export default async function Home() {
  // Check if user is authenticated via Auth0
  const session = await getSession();

  if (session) {
    // User is logged in, redirect to dashboard
    redirect("/dashboard");
  } else {
    // User is not logged in, redirect to login page
    redirect("/login");
  }
}

