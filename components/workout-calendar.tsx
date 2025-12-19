"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from "date-fns";

interface WorkoutCalendarProps {
  workouts?: Array<{ workout_date: string; focus?: string; id?: string }> | null;
}

export function WorkoutCalendar({ workouts = [] }: WorkoutCalendarProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allWorkouts, setAllWorkouts] = useState<Array<{ workout_date: string; focus?: string; id?: string }>>(workouts || []);

  // Load workouts from localStorage in mock mode
  useEffect(() => {
    const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
    
    if (isMockMode && typeof window !== 'undefined') {
      const mockWorkouts = JSON.parse(localStorage.getItem('mock-workouts') || '[]');
      const mockUser = JSON.parse(sessionStorage.getItem('mock-user') || 'null');
      
      // Filter by user if mock user exists
      const userWorkouts = mockUser 
        ? mockWorkouts.filter((w: any) => w.user_id === mockUser.id)
        : mockWorkouts;
      
      setAllWorkouts(userWorkouts.map((w: any) => ({
        workout_date: w.workout_date,
        focus: w.focus,
        id: w.id,
      })));
    } else {
      setAllWorkouts(workouts || []);
    }
  }, [workouts]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get first day of month to determine offset
  const firstDayOfWeek = getDay(monthStart);
  const daysOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Convert Sunday (0) to be last

  // Create array with empty cells for days before month starts
  const emptyDays = Array.from({ length: daysOffset }, (_, i) => null);
  const calendarDays = [...emptyDays, ...daysInMonth];

  // Parse date string (YYYY-MM-DD) as local date to avoid timezone issues
  const parseLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed
  };

  const hasWorkout = (date: Date) => {
    if (!allWorkouts || allWorkouts.length === 0) return false;
    return allWorkouts.some((workout) => {
      if (!workout.workout_date) return false;
      const workoutDate = parseLocalDate(workout.workout_date);
      return isSameDay(workoutDate, date);
    });
  };

  const getWorkoutForDate = (date: Date) => {
    if (!allWorkouts || allWorkouts.length === 0) return null;
    // Find the most recent workout for this date (in case there are multiple)
    const workoutsOnDate = allWorkouts.filter((workout) => {
      if (!workout.workout_date) return false;
      const workoutDate = parseLocalDate(workout.workout_date);
      return isSameDay(workoutDate, date);
    });
    // Return the first one (or most recent if sorted)
    return workoutsOnDate.length > 0 ? workoutsOnDate[0] : null;
  };

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Workout Calendar</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={previousMonth}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {format(currentDate, "MMMM yyyy")}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={nextMonth}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1" style={{ pointerEvents: 'auto' }}>
          {/* Week day headers */}
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const hasWorkoutOnDay = hasWorkout(day);
            const workout = getWorkoutForDate(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);

            // Make days with workouts clickable - use workout ID if available, otherwise use date
            if (hasWorkoutOnDay && workout) {
              const workoutHref = workout.id 
                ? `/dashboard/history?workout=${workout.id}`
                : `/dashboard/history?date=${format(day, "yyyy-MM-dd")}`;
              
              return (
                <Link
                  key={day.toISOString()}
                  href={workoutHref}
                  className={`aspect-square flex flex-col items-center justify-center p-1 rounded-md border transition-colors relative w-full ${
                    isToday
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-primary/10 border-primary/20 hover:bg-primary/20 active:bg-primary/30"
                  } cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
                  title={`${format(day, "MMM d")} - ${workout?.focus || 'Workout'} (Click to view)`}
                >
                  <span className={`text-xs font-medium ${isToday ? "text-primary-foreground" : ""}`}>
                    {format(day, "d")}
                  </span>
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5" />
                </Link>
              );
            }

            // Days without workouts - clickable to add a workout
            return (
              <button
                key={day.toISOString()}
                onClick={() => router.push(`/dashboard/log?date=${format(day, "yyyy-MM-dd")}`)}
                className={`aspect-square flex flex-col items-center justify-center p-1 rounded-md border transition-colors cursor-pointer ${
                  isToday
                    ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                    : isCurrentMonth
                    ? "border-transparent hover:bg-accent hover:border-border"
                    : "border-transparent text-muted-foreground opacity-50 hover:opacity-75"
                }`}
                title={`${format(day, "MMM d")} - Click to add workout`}
              >
                <span className={`text-xs font-medium ${isToday ? "text-primary-foreground" : ""}`}>
                  {format(day, "d")}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t space-y-1">
          <p className="text-xs text-muted-foreground">
            <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2" />
            Days with workouts (click to view)
          </p>
          <p className="text-xs text-muted-foreground">
            <Plus className="inline-block w-3 h-3 mr-1.5" />
            Click any day to add a workout
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

