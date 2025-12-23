import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@auth0/nextjs-auth0";
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

  let userName: string | null = null;
  let userPicture: string | null = null;

  // Try to get user from Auth0
  try {
    const session = await getSession();
    if (session?.user) {
      userName = session.user.name || session.user.nickname || null;
      userPicture = session.user.picture || null;
    }
  } catch (error) {
    console.warn("Failed to get Auth0 session:", error);
  }

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
      <Nav userName={userName} userPicture={userPicture} />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

