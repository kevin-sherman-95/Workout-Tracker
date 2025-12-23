import { auth0 } from "@/lib/auth0";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  let user = null;
  
  try {
    if (auth0) {
      const session = await auth0.getSession();
      user = session?.user || null;
    }
  } catch (error) {
    console.error("Failed to get user session:", error);
  }

  return <SettingsClient user={user} />;
}



