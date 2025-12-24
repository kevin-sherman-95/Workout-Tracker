import { Nav } from "@/components/nav";
import { auth0 } from "@/lib/auth0-client";
import { syncUserToSupabase } from "@/lib/auth0";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get session from Auth0 (server-side)
  const session = await auth0.getSession();
  
  // Sync user to Supabase on each dashboard access (idempotent operation)
  if (session?.user) {
    await syncUserToSupabase(session.user);
  }

  const userName = session?.user?.name || session?.user?.nickname || null;
  const userPicture = session?.user?.picture || null;

  return (
    <div className="min-h-screen bg-background">
      <Nav userName={userName} userPicture={userPicture} />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
