import { Nav } from "@/components/nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth is handled client-side via Auth0 useUser hook in Nav component
  return (
    <div className="min-h-screen bg-background">
      <Nav userName={null} userPicture={null} />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

