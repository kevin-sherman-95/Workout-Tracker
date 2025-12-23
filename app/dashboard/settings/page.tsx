import { getSession } from "@auth0/nextjs-auth0";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  let user = null;
  
  try {
    const session = await getSession();
    user = session?.user || null;
  } catch (error) {
    console.error("Failed to get user session:", error);
  }

  return <SettingsClient user={user} />;
}



