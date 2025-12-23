import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to login page - Auth0 will handle authentication
  redirect("/login");
}

