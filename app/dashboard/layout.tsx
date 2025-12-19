import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // BYPASS AUTH FOR TESTING - Remove this when Supabase is configured
  const BYPASS_AUTH = process.env.BYPASS_AUTH === 'true' || 
    !process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

  if (!BYPASS_AUTH) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        redirect("/login");
      }
    } catch (error) {
      // If Supabase client creation fails, allow access for testing
      console.warn("Supabase not configured, bypassing auth for testing");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

