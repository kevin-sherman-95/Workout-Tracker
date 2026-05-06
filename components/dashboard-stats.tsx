"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp } from "lucide-react";
import {
  getMonthStartLocal,
  getWeekStartLocal,
  getYtdStartLocal,
  parseWorkoutLocalDate,
} from "@/lib/workout-date-periods";

interface DashboardStatsProps {
  serverWorkouts: any[] | null;
  /** Count from server: workouts with workout_date in [Jan 1, today] (local calendar year). */
  serverYtdWorkouts: number;
}

export function DashboardStats({ serverWorkouts, serverYtdWorkouts }: DashboardStatsProps) {
  const [ytdWorkouts, setYtdWorkouts] = useState(0);
  const [thisWeekWorkouts, setThisWeekWorkouts] = useState(0);
  const [thisMonthWorkouts, setThisMonthWorkouts] = useState(0);

  /** YTD, calendar week (Mon–Sun, Mon start), and calendar month (1st–end) using local dates on workout_date. */
  const calculateStats = (workouts: any[]) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const ytdStart = getYtdStartLocal(today);
    const weekStart = getWeekStartLocal(today);
    const monthStart = getMonthStartLocal(today);

    let ytdCount = 0;
    let thisWeekCount = 0;
    let thisMonthCount = 0;
    for (const w of workouts) {
      if (!w?.workout_date) continue;
      const workoutDate = parseWorkoutLocalDate(w.workout_date);
      if (workoutDate > today) continue;
      if (workoutDate >= ytdStart) ytdCount++;
      if (workoutDate >= weekStart) thisWeekCount++;
      if (workoutDate >= monthStart) thisMonthCount++;
    }

    return { ytdCount, thisWeekCount, thisMonthCount };
  };

  useEffect(() => {
    const updateStats = () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      // Check if we're in mock mode - no URL, placeholder, or invalid URL
      const isMockMode = !supabaseUrl || 
                        supabaseUrl.includes('placeholder') || 
                        supabaseUrl.includes('your-project') ||
                        supabaseUrl === 'your_supabase_url' ||
                        !supabaseUrl.startsWith('http');
      
      if (isMockMode && typeof window !== 'undefined') {
        // Load workouts from localStorage
        const mockWorkouts = JSON.parse(localStorage.getItem('mock-workouts') || '[]');
        const mockUser = JSON.parse(sessionStorage.getItem('mock-user') || 'null');
        
        // Filter by user if mock user exists
        const userWorkouts = mockUser 
          ? mockWorkouts.filter((w: any) => w.user_id === mockUser.id)
          : mockWorkouts;
        
        const { ytdCount, thisWeekCount, thisMonthCount } =
          calculateStats(userWorkouts);
        setYtdWorkouts(ytdCount);
        setThisWeekWorkouts(thisWeekCount);
        setThisMonthWorkouts(thisMonthCount);
      } else {
        // Use server YTD count; week/month from full workout list (same date rules)
        setYtdWorkouts(serverYtdWorkouts);
        const { thisWeekCount, thisMonthCount } = calculateStats(
          serverWorkouts || []
        );
        setThisWeekWorkouts(thisWeekCount);
        setThisMonthWorkouts(thisMonthCount);
      }
    };
    
    // Update stats immediately
    updateStats();
  }, [serverWorkouts, serverYtdWorkouts]);

  // Listen for storage changes to update stats in real-time
  useEffect(() => {
    const handleStorageChange = () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const isMockMode = !supabaseUrl || 
                        supabaseUrl.includes('placeholder') || 
                        supabaseUrl.includes('your-project') ||
                        supabaseUrl === 'your_supabase_url' ||
                        !supabaseUrl.startsWith('http');
      
      if (isMockMode && typeof window !== 'undefined') {
        const mockWorkouts = JSON.parse(localStorage.getItem('mock-workouts') || '[]');
        const mockUser = JSON.parse(sessionStorage.getItem('mock-user') || 'null');
        
        const userWorkouts = mockUser 
          ? mockWorkouts.filter((w: any) => w.user_id === mockUser.id)
          : mockWorkouts;
        
        const { ytdCount, thisWeekCount, thisMonthCount } =
          calculateStats(userWorkouts);
        setYtdWorkouts(ytdCount);
        setThisWeekWorkouts(thisWeekCount);
        setThisMonthWorkouts(thisMonthCount);
      }
    };

    // Listen for storage events (when workouts are saved in other tabs/components)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      
      // Also listen for custom events (for same-tab updates)
      window.addEventListener('workoutUpdated', handleStorageChange);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('workoutUpdated', handleStorageChange);
      };
    }
  }, []);

  const statCardClassName =
    "block rounded-lg transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <>
      <Link href="/dashboard/history" className={statCardClassName}>
        <Card className="h-full cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workouts (YTD)</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ytdWorkouts}</div>
          </CardContent>
        </Card>
      </Link>

      <Link href="/dashboard/history?period=week" className={statCardClassName}>
        <Card className="h-full cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisWeekWorkouts}</div>
          </CardContent>
        </Card>
      </Link>

      <Link href="/dashboard/history?period=month" className={statCardClassName}>
        <Card className="h-full cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisMonthWorkouts}</div>
          </CardContent>
        </Card>
      </Link>
    </>
  );
}

