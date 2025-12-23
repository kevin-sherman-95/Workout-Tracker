"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp } from "lucide-react";

// Parse date string (YYYY-MM-DD) as local date to avoid timezone issues
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
};

interface DashboardStatsProps {
  serverWorkouts: any[] | null;
  serverTotalWorkouts: number;
}

export function DashboardStats({ serverWorkouts, serverTotalWorkouts }: DashboardStatsProps) {
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [thisWeekWorkouts, setThisWeekWorkouts] = useState(0);
  const [thisMonthWorkouts, setThisMonthWorkouts] = useState(0);

  const calculateStats = (workouts: any[]) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    // Calculate workouts this week (last 7 days, including today)
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    const thisWeekCount = workouts.filter((w: any) => {
      const workoutDate = parseLocalDate(w.workout_date);
      return workoutDate >= weekAgo && workoutDate <= today;
    }).length;
    
    // Calculate workouts this month (from 1st of current month)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const thisMonthCount = workouts.filter((w: any) => {
      const workoutDate = parseLocalDate(w.workout_date);
      return workoutDate >= monthStart && workoutDate <= today;
    }).length;
    
    return { thisWeekCount, thisMonthCount };
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
        
        setTotalWorkouts(userWorkouts.length);
        
        const { thisWeekCount, thisMonthCount } = calculateStats(userWorkouts);
        setThisWeekWorkouts(thisWeekCount);
        setThisMonthWorkouts(thisMonthCount);
      } else {
        // Use server data
        setTotalWorkouts(serverTotalWorkouts);
        
        const { thisWeekCount, thisMonthCount } = calculateStats(serverWorkouts || []);
        setThisWeekWorkouts(thisWeekCount);
        setThisMonthWorkouts(thisMonthCount);
      }
    };
    
    // Update stats immediately
    updateStats();
  }, [serverWorkouts, serverTotalWorkouts]);

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
        
        setTotalWorkouts(userWorkouts.length);
        
        const { thisWeekCount, thisMonthCount } = calculateStats(userWorkouts);
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

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalWorkouts}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Week</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{thisWeekWorkouts}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Month</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{thisMonthWorkouts}</div>
        </CardContent>
      </Card>
    </>
  );
}

