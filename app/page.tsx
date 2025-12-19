import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  // BYPASS AUTH FOR TESTING
  const BYPASS_AUTH = process.env.BYPASS_AUTH === 'true' || 
    !process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

  if (BYPASS_AUTH) {
    redirect("/dashboard");
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      redirect("/dashboard");
    } else {
      redirect("/login");
    }
  } catch (error) {
    // If Supabase not configured, redirect to dashboard for testing
    redirect("/dashboard");
  }
}

