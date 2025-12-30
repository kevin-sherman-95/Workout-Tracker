"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Settings, Bell, Shield, Palette, Save } from "lucide-react";

interface UserInfo {
  sub?: string;
  email?: string;
  name?: string;
  nickname?: string;
  picture?: string;
}

interface SettingsClientProps {
  user: UserInfo | null;
}

export function SettingsClient({ user }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<"account" | "preferences" | "notifications">("account");
  const [displayName, setDisplayName] = useState(user?.name || user?.nickname || "");
  const [weightUnit, setWeightUnit] = useState("lbs");
  const [theme, setTheme] = useState("dark");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [workoutReminders, setWorkoutReminders] = useState(false);

  const tabs = [
    { id: "account" as const, label: "Account", icon: User },
    { id: "preferences" as const, label: "Preferences", icon: Settings },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          {activeTab === "account" && (
            <Card className="p-6 space-y-6">
              <div className="flex items-center gap-4 pb-6 border-b border-border">
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt="Profile"
                    className="h-16 w-16 rounded-full ring-2 ring-primary/20"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {user?.name || user?.nickname || "Guest User"}
                  </h2>
                  <p className="text-sm text-muted-foreground">{user?.email || "No email"}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={user?.email || ""}
                    disabled
                    className="opacity-60"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email is managed through your authentication provider
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <Button className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </Card>
          )}

          {activeTab === "preferences" && (
            <Card className="p-6 space-y-6">
              <div className="pb-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Workout Preferences
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Customize your workout tracking experience
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label>Weight Unit</Label>
                  <div className="flex gap-3">
                    {["lbs", "kg"].map((unit) => (
                      <button
                        key={unit}
                        onClick={() => setWeightUnit(unit)}
                        className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          weightUnit === unit
                            ? "bg-primary text-primary-foreground"
                            : "bg-accent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {unit.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Theme</Label>
                  <div className="flex gap-3">
                    {[
                      { id: "dark", label: "Dark" },
                      { id: "light", label: "Light" },
                      { id: "system", label: "System" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          theme === t.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-accent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Default Workout Focus</Label>
                  <select className="w-full px-3 py-2 rounded-lg bg-accent border border-border text-foreground">
                    <option value="">No default</option>
                    <option value="Chest / Shoulders / Triceps">Chest / Shoulders / Triceps</option>
                    <option value="Back / Biceps">Back / Biceps</option>
                    <option value="Legs">Legs</option>
                    <option value="Full Body">Full Body</option>
                    <option value="Cardio">Cardio</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <Button className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Preferences
                </Button>
              </div>
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card className="p-6 space-y-6">
              <div className="pb-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Settings
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Control how you receive updates and reminders
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-accent/50">
                  <div>
                    <h3 className="font-medium text-foreground">Email Notifications</h3>
                    <p className="text-sm text-muted-foreground">
                      Receive weekly workout summaries via email
                    </p>
                  </div>
                  <button
                    onClick={() => setEmailNotifications(!emailNotifications)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      emailNotifications ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                        emailNotifications ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-accent/50">
                  <div>
                    <h3 className="font-medium text-foreground">Workout Reminders</h3>
                    <p className="text-sm text-muted-foreground">
                      Get reminded to log your workouts
                    </p>
                  </div>
                  <button
                    onClick={() => setWorkoutReminders(!workoutReminders)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      workoutReminders ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                        workoutReminders ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  We respect your privacy. Unsubscribe anytime.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

