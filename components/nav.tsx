"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/account-menu";
import {
  LayoutDashboard,
  Plus,
  History,
  TrendingUp,
} from "lucide-react";

interface NavProps {
  userName?: string | null;
  userPicture?: string | null;
}

export function Nav({ userName, userPicture }: NavProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/log", label: "Log Workout", icon: Plus },
    { href: "/dashboard/history", label: "History", icon: History },
    { href: "/dashboard/progress", label: "Progress", icon: TrendingUp },
  ];

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto min-w-0 px-4">
        <div className="flex h-16 min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-8">
            <Link
              href="/dashboard"
              className="shrink-0 text-xl font-bold text-foreground"
            >
              Workout Tracker
            </Link>
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-2 md:gap-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex shrink-0 items-center space-x-2 rounded-md px-2 py-2 text-sm font-medium transition-colors sm:px-3 ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="shrink-0">
            <AccountMenu userName={userName} userPicture={userPicture} />
          </div>
        </div>
      </div>
    </nav>
  );
}
