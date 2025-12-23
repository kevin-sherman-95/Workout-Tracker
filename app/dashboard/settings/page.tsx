import { SettingsClient } from "./settings-client";

export default function SettingsPage() {
  // User data is fetched client-side in SettingsClient via useUser hook
  return <SettingsClient user={null} />;
}



