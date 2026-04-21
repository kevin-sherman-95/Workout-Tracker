import { Suspense } from "react";
import { SettingsClient } from "./settings-client";

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground">Loading settings…</p>
      }
    >
      <SettingsClient user={null} />
    </Suspense>
  );
}



