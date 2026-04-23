"use client";

import { useEffect, useRef, useState, useId } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useTheme, getResolvedTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { User, Settings, LogOut, Sun, Moon } from "lucide-react";

type AccountMenuProps = {
  userName?: string | null;
  userPicture?: string | null;
};

export function AccountMenu({ userName, userPicture }: AccountMenuProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const isDark =
    (theme === "system" ? getResolvedTheme("system") : theme) === "dark";

  useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (!root.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    // Bubble-phase click only (no capture). Capture + mousedown can swallow or
    // desync the click sequence in embedded previews and some browsers.
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative z-20">
      <Button
        type="button"
        variant="ghost"
        className="flex max-w-full items-center gap-2 hover:bg-accent"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        {userPicture ? (
          <img
            src={userPicture}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
        )}
        <span className="min-w-0 max-w-[10rem] truncate text-sm font-medium text-foreground sm:max-w-none">
          {userName || "Account"}
        </span>
      </Button>

      {open && (
        <div
          id={menuId}
          className="absolute right-0 top-full z-50 mt-2 min-w-[200px] rounded-lg border border-border bg-card py-1.5 text-left shadow-xl"
          role="menu"
        >
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            My Account
          </div>
          <div className="my-1.5 h-px bg-border" role="none" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
            onClick={() => {
              setOpen(false);
              router.push("/dashboard/settings?tab=account");
            }}
          >
            <User className="h-4 w-4 mr-3" />
            Profile
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
            onClick={() => {
              setOpen(false);
              router.push("/dashboard/settings?tab=preferences");
            }}
          >
            <Settings className="h-4 w-4 mr-3" />
            Settings
          </button>
          <div className="flex px-3 py-2">
            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              aria-label={isDark ? "Dark mode, switch to light" : "Light mode, switch to dark"}
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className={cn(
                "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isDark ? "bg-primary" : "bg-muted/80"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none absolute left-0.5 top-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-card text-foreground shadow-sm ring-1 ring-border/50 transition-transform duration-200 ease-out",
                  isDark ? "translate-x-6" : "translate-x-0"
                )}
                aria-hidden
              >
                {isDark ? (
                  <Moon className="h-3.5 w-3.5" />
                ) : (
                  <Sun className="h-3.5 w-3.5" />
                )}
              </span>
            </button>
          </div>
          <div className="my-1.5 h-px bg-border" role="none" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
            onClick={() => {
              setOpen(false);
              window.location.href = "/auth/logout";
            }}
          >
            <LogOut className="h-4 w-4 mr-3" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
