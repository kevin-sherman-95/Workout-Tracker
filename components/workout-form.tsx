"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@auth0/nextjs-auth0/client";
import { createClient, isInMockMode } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Check, Save, ChevronDown, Clock, TrendingUp, TrendingDown, Minus, Trophy, X, ArrowRight } from "lucide-react";
import type { Exercise, WorkoutExercise, WorkoutFocus } from "@/lib/types";

interface ExerciseUsage {
  exercise_id: string;
  usage_count: number;
}

interface ExerciseSet {
  exerciseId: string;
  sets: Array<{
    reps: number;
    weight: number;
    distance?: number;
    time?: number;
    pace?: number;
    /**
     * Swimming: set count for this row (persisted in `rest_interval` column for that workout_exercise row).
     * Interval MM:SS uses `time` → `reps` (seconds); distance yd uses `distance` → `weight`.
     */
    swimSets?: number;
  }>;
  restInterval: string;
}

interface WorkoutFormProps {
  workoutId?: string;
  initialDate?: string;
  userId?: string;
}

export function WorkoutForm({ workoutId, initialDate, userId: propUserId }: WorkoutFormProps) {
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useUser();
  
  // Get user ID from Auth0 hook or prop
  const userId = propUserId || user?.sub || null;
  
  const [focus, setFocus] = useState<WorkoutFocus>("Chest / Shoulders / Triceps");
  const [workoutDate, setWorkoutDate] = useState(
    initialDate || new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseUsage, setExerciseUsage] = useState<Map<string, number>>(new Map());
  const [selectedExercises, setSelectedExercises] = useState<ExerciseSet[]>([]);
  const selectedExercisesRef = useRef<ExerciseSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingWorkout, setIsLoadingWorkout] = useState(!!workoutId);
  const [savedExercises, setSavedExercises] = useState<Set<number>>(new Set());
  const [savingExercise, setSavingExercise] = useState<number | null>(null);
  const [currentWorkoutId, setCurrentWorkoutId] = useState<string | undefined>(workoutId);
  const [collapsedExercises, setCollapsedExercises] = useState<Set<number>>(new Set());
  const [exercisesLoadedForFocus, setExercisesLoadedForFocus] = useState<WorkoutFocus | null>(null);
  const focusRef = useRef(focus);
  focusRef.current = focus;

  // Post-save comparison state
  interface WorkoutStats {
    totalSets: number;
    totalReps: number;
    totalVolume: number;
    totalTime: number;
    totalDistance: number;
    exerciseCount: number;
    exerciseBreakdown: Array<{
      name: string;
      sets: number;
      bestWeight: number;
      bestReps: number;
      totalVolume: number;
      totalTime: number;
      totalDistance: number;
    }>;
    date: string;
  }
  const [showComparison, setShowComparison] = useState(false);
  const [currentStats, setCurrentStats] = useState<WorkoutStats | null>(null);
  const [previousStats, setPreviousStats] = useState<WorkoutStats | null>(null);

  // Keep ref in sync with state for use in handleSubmit
  useEffect(() => {
    selectedExercisesRef.current = selectedExercises;
  }, [selectedExercises]);

  const focusOptions: WorkoutFocus[] = [
    "Chest / Shoulders / Triceps",
    "Back / Biceps",
    "Legs",
    "Full Body",
    "Cardio",
    "Other",
  ];

  const restIntervalOptions = [
    { value: "30", label: "30 seconds" },
    { value: "60", label: "60 seconds" },
    { value: "90", label: "90 seconds" },
    { value: "120", label: "2 minutes" },
    { value: "180", label: "3 minutes" },
  ];

  // Helper functions for time formatting (stored as total seconds)
  const formatTimeDisplay = (totalSeconds: number): string => {
    if (totalSeconds === 0) return "";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const parseTimeInput = (value: string): number => {
    // Handle empty input
    if (!value || value.trim() === "") return 0;
    
    // If it contains a colon, parse as MM:SS
    if (value.includes(":")) {
      const [minStr, secStr] = value.split(":");
      const minutes = parseInt(minStr) || 0;
      const seconds = parseInt(secStr) || 0;
      return minutes * 60 + seconds;
    }
    
    // Otherwise treat as minutes only
    const minutes = parseInt(value) || 0;
    return minutes * 60;
  };

  // State for time input display values (what's shown in the input while typing)
  const [timeDisplayValues, setTimeDisplayValues] = useState<Record<string, string>>({});
  
  // Get display value for a time input
  const getTimeDisplayValue = (exerciseIndex: number, setIndex: number, storedSeconds: number): string => {
    const key = `${exerciseIndex}-${setIndex}`;
    // If user is actively editing, use the display value state
    if (timeDisplayValues[key] !== undefined) {
      return timeDisplayValues[key];
    }
    // Otherwise, format the stored seconds
    if (!storedSeconds) return "";
    const mins = Math.floor(storedSeconds / 60);
    const secs = storedSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  
  // Handle time input change (while typing) - format in real-time
  const handleTimeInputChange = (exerciseIndex: number, setIndex: number, value: string) => {
    const key = `${exerciseIndex}-${setIndex}`;
    // Extract only digits
    const digits = value.replace(/\D/g, "");
    
    // Limit to 4 digits (MM:SS)
    const limited = digits.slice(0, 4);
    
    // Format with colon: if we have 3+ digits, insert colon after first 2
    let formatted: string;
    if (limited.length <= 2) {
      formatted = limited;
    } else {
      formatted = limited.slice(0, limited.length - 2) + ":" + limited.slice(-2);
    }
    
    setTimeDisplayValues(prev => ({ ...prev, [key]: formatted }));
    
    // Also update the stored time value immediately
    if (limited.length >= 1) {
      const padded = limited.padStart(4, "0");
      const mins = parseInt(padded.slice(0, 2), 10);
      const secs = parseInt(padded.slice(2), 10);
      const totalSeconds = mins * 60 + secs;
      updateSet(exerciseIndex, setIndex, "time", totalSeconds);
    } else {
      updateSet(exerciseIndex, setIndex, "time", 0);
    }
  };
  
  // Handle time input blur - ensure proper formatting
  const handleTimeInputBlur = (exerciseIndex: number, setIndex: number) => {
    const key = `${exerciseIndex}-${setIndex}`;
    const currentValue = timeDisplayValues[key] || "";
    const digits = currentValue.replace(/\D/g, "");
    
    if (!digits) {
      // Clear the display
      setTimeDisplayValues(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    
    // Ensure proper MM:SS format
    const padded = digits.padStart(4, "0");
    const mins = parseInt(padded.slice(0, 2), 10);
    const secs = parseInt(padded.slice(2), 10);
    const formatted = `${mins}:${secs.toString().padStart(2, "0")}`;
    
    setTimeDisplayValues(prev => ({ ...prev, [key]: formatted }));
  };

  // State for pace input display values (for Running exercise - pace in MM:SS per mile)
  const [paceDisplayValues, setPaceDisplayValues] = useState<Record<string, string>>({});
  
  // Get display value for a pace input
  const getPaceDisplayValue = (exerciseIndex: number, setIndex: number, storedSeconds: number): string => {
    const key = `pace-${exerciseIndex}-${setIndex}`;
    // If user is actively editing, use the display value state
    if (paceDisplayValues[key] !== undefined) {
      return paceDisplayValues[key];
    }
    // Otherwise, format the stored seconds
    if (!storedSeconds) return "";
    const mins = Math.floor(storedSeconds / 60);
    const secs = storedSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  
  // Handle pace input change (while typing) - format in real-time
  const handlePaceInputChange = (exerciseIndex: number, setIndex: number, value: string) => {
    const key = `pace-${exerciseIndex}-${setIndex}`;
    // Extract only digits
    const digits = value.replace(/\D/g, "");
    
    // Limit to 4 digits (MM:SS)
    const limited = digits.slice(0, 4);
    
    // Format with colon: if we have 3+ digits, insert colon after first 2
    let formatted: string;
    if (limited.length <= 2) {
      formatted = limited;
    } else {
      formatted = limited.slice(0, limited.length - 2) + ":" + limited.slice(-2);
    }
    
    setPaceDisplayValues(prev => ({ ...prev, [key]: formatted }));
    
    // Also update the stored pace value immediately
    if (limited.length >= 1) {
      const padded = limited.padStart(4, "0");
      const mins = parseInt(padded.slice(0, 2), 10);
      const secs = parseInt(padded.slice(2), 10);
      const totalSeconds = mins * 60 + secs;
      updateSet(exerciseIndex, setIndex, "pace", totalSeconds);
    } else {
      updateSet(exerciseIndex, setIndex, "pace", 0);
    }
  };
  
  // Handle pace input blur - ensure proper formatting
  const handlePaceInputBlur = (exerciseIndex: number, setIndex: number) => {
    const key = `pace-${exerciseIndex}-${setIndex}`;
    const currentValue = paceDisplayValues[key] || "";
    const digits = currentValue.replace(/\D/g, "");
    
    if (!digits) {
      // Clear the display
      setPaceDisplayValues(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    
    // Ensure proper MM:SS format
    const padded = digits.padStart(4, "0");
    const mins = parseInt(padded.slice(0, 2), 10);
    const secs = parseInt(padded.slice(2), 10);
    const formatted = `${mins}:${secs.toString().padStart(2, "0")}`;
    
    setPaceDisplayValues(prev => ({ ...prev, [key]: formatted }));
  };

  // Get muscle groups for the selected focus
  // Core muscle group is included in all workout types so "Core" exercise is always available
  const getMuscleGroupsForFocus = (focus: WorkoutFocus): string[] => {
    const mapping: Record<WorkoutFocus, string[]> = {
      "Chest / Shoulders / Triceps": ["Chest", "Triceps", "Shoulders", "Core"],
      "Back / Biceps": ["Back", "Biceps", "Core"],
      "Legs": ["Legs", "Core"],
      "Full Body": ["Chest", "Triceps", "Shoulders", "Back", "Biceps", "Legs", "Core"],
      "Cardio": ["Cardio", "Core"],
      "Other": ["Core"],
    };
    return mapping[focus] || [];
  };

  // Mock exercises for testing when Supabase is not configured
  const getMockExercises = (focus: WorkoutFocus): Exercise[] => {
    const mapping: Record<WorkoutFocus, string[]> = {
      "Chest / Shoulders / Triceps": [
        "Barbell Bench Press",
        "Dumbbell Bench Press",
        "Barbell Incline Bench Press",
        "Dumbbell Incline Bench Press",
        "Dumbbell Flyes",
        "Machine Flyes",
        "Machine Flies",
        "Dumbbell Shoulder Press",
        "Front Raises",
        "Lateral Raises",
        "Front x Lateral Raises",
        "Front + Lateral Raises",
        "Tricep Pushdowns",
        "Tricep Rope Pulldowns",
        "Rope Pull Downs",
        "Core",
      ],
      "Back / Biceps": [
        "Deadlift",
        "Pull-ups",
        "Barbell Row",
        "Lat Pulldown",
        "Rows",
        "Underhand Lat Pull Down",
        "Close Grip Pull Down",
        "Barbell Curl",
        "Dumbbell Curl",
        "Rope Curls",
        "21 Curls",
        "Hammer 21 Curls",
        "Dumbbell Preacher Curls",
        "Core",
      ],
      "Legs": [
        "Squats",
        "Split Squats",
        "Leg Press",
        "Romanian Deadlift",
        "Leg Curls",
        "Hamstring Curls",
        "Single Leg Hamstring Curls",
        "Leg Extensions",
        "Lunges",
        "Core",
      ],
      "Full Body": [
        "Squats",
        "Bench Press",
        "Deadlift",
        "Pull-ups",
        "Overhead Press",
        "Core",
      ],
      "Cardio": [
        "Running",
        "Cycling",
        "Rowing",
        "Swimming",
        "Peloton",
        "Core",
      ],
      "Other": [
        "Custom Exercise",
        "Core",
      ],
    };
    
    const exerciseNames = mapping[focus] || [];
    return exerciseNames.map((name, index) => ({
      id: `mock-${focus}-${index}`,
      name,
      muscle_group_id: `mock-mg-${index}`,
    }));
  };

  // Helper to sort exercises by usage count (most used first)
  const sortExercisesByUsage = (exerciseList: Exercise[], usageMap: Map<string, number>): Exercise[] => {
    return [...exerciseList].sort((a, b) => {
      const usageA = usageMap.get(a.id) || 0;
      const usageB = usageMap.get(b.id) || 0;
      // Sort by usage count descending, then alphabetically for ties
      if (usageB !== usageA) {
        return usageB - usageA;
      }
      return a.name.localeCompare(b.name);
    });
  };

  /** Order DB rows like getMockExercises(focus), then append any extra DB-only names (e.g. custom). */
  const mergeDbWithCanonicalExerciseOrder = (f: WorkoutFocus, fromDb: Exercise[]): Exercise[] => {
    const canonical = getMockExercises(f);
    const byName = new Map(fromDb.map((e) => [e.name, e]));
    const ordered: Exercise[] = [];
    const seenNames = new Set<string>();
    for (const { name } of canonical) {
      const row = byName.get(name);
      if (row) {
        ordered.push(row);
        seenNames.add(name);
      }
    }
    for (const row of fromDb) {
      if (!seenNames.has(row.name)) {
        ordered.push(row);
        seenNames.add(row.name);
      }
    }
    return ordered;
  };

  // Load exercise usage data for the current user
  const loadExerciseUsage = async (client: any, userId: string, isMockMode: boolean): Promise<Map<string, number>> => {
    const usageMap = new Map<string, number>();
    
    if (isMockMode) {
      // Load from localStorage for mock mode
      if (typeof window !== 'undefined') {
        const mockUsage = JSON.parse(localStorage.getItem('mock-exercise-usage') || '{}');
        const userUsage = mockUsage[userId] || {};
        Object.entries(userUsage).forEach(([exerciseId, count]) => {
          usageMap.set(exerciseId, count as number);
        });
      }
    } else {
      try {
        const { data: usageData } = await client
          .from("user_exercise_usage")
          .select("exercise_id, usage_count")
          .eq("user_id", userId);
        
        if (usageData) {
          usageData.forEach((item: ExerciseUsage) => {
            usageMap.set(item.exercise_id, item.usage_count);
          });
        }
      } catch (err) {
        console.error("Failed to load exercise usage:", err);
      }
    }
    
    return usageMap;
  };

  // Load exercises based on focus
  useEffect(() => {
    const loadExercises = async () => {
      const capturedFocus = focus;
      const applyExercisesIfCurrent = (sortedExercises: Exercise[]) => {
        if (capturedFocus !== focusRef.current) return;
        setExercises(sortedExercises);
        setExercisesLoadedForFocus(capturedFocus);
      };
      const client = createClient();
      const isMockMode = isInMockMode();
      
      // Get user ID for usage tracking - use component-level userId or fall back to mock
      const effectUserId = userId || 'mock-user-id';
      
      // Load usage data first
      const usageMap = await loadExerciseUsage(client, effectUserId, isMockMode);
      setExerciseUsage(usageMap);
      
      // In mock mode, always use mock exercises directly
      if (isMockMode) {
        const mockExercises = getMockExercises(focus);
        const sortedExercises = sortExercisesByUsage(mockExercises, usageMap);
        applyExercisesIfCurrent(sortedExercises);
        
        // Store mock exercises in localStorage
        if (typeof window !== 'undefined' && capturedFocus === focusRef.current) {
          const existingExercises = JSON.parse(localStorage.getItem('mock-exercises') || '[]');
          const existingIds = new Set(existingExercises.map((e: any) => e.id));
          const newExercises = mockExercises.filter((e: any) => !existingIds.has(e.id));
          if (newExercises.length > 0) {
            localStorage.setItem('mock-exercises', JSON.stringify([...existingExercises, ...newExercises]));
          }
        }
        return;
      }
      
      const muscleGroups = getMuscleGroupsForFocus(focus);
      if (muscleGroups.length === 0) {
        // Use mock exercises for "Other" focus
        const mockExercises = getMockExercises(focus);
        const sortedExercises = sortExercisesByUsage(mockExercises, usageMap);
        applyExercisesIfCurrent(sortedExercises);
        return;
      }

      try {
        const { data: muscleGroupData } = await client
          .from("muscle_groups")
          .select("id")
          .in("name", muscleGroups);

        if (muscleGroupData && muscleGroupData.length > 0) {
          const muscleGroupIds = muscleGroupData.map((mg: any) => mg.id);
          const { data: exerciseData } = await client
            .from("exercises")
            .select("*")
            .in("muscle_group_id", muscleGroupIds)
            .order("name");

          const exercisesToUse =
            exerciseData && exerciseData.length > 0
              ? mergeDbWithCanonicalExerciseOrder(capturedFocus, exerciseData as Exercise[])
              : getMockExercises(focus);
          const sortedExercises = sortExercisesByUsage(exercisesToUse, usageMap);
          applyExercisesIfCurrent(sortedExercises);
        } else {
          // Fallback to mock exercises if no data returned
          const mockExercises = getMockExercises(focus);
          const sortedExercises = sortExercisesByUsage(mockExercises, usageMap);
          applyExercisesIfCurrent(sortedExercises);
        }
      } catch (error) {
        // If Supabase query fails, use mock exercises for testing
        const mockExercises = getMockExercises(focus);
        const sortedExercises = sortExercisesByUsage(mockExercises, usageMap);
        applyExercisesIfCurrent(sortedExercises);
      }
    };

    loadExercises();
  }, [focus, userId]);

  // Load existing workout data when editing
  useEffect(() => {
    const loadWorkout = async () => {
      if (!workoutId) return;

      setIsLoadingWorkout(true);
      try {
        const client = createClient();

        // Try to load workout from Supabase first
        let workout: any = null;
        try {
          const { data } = await client
            .from("workouts")
            .select("*")
            .eq("id", workoutId)
            .single();
          workout = data;
        } catch {
          // Supabase failed, ignore and try localStorage
        }

        // Fall back to localStorage if Supabase didn't return data
        if (!workout && typeof window !== 'undefined') {
          const mockWorkouts = JSON.parse(localStorage.getItem('mock-workouts') || '[]');
          workout = mockWorkouts.find((w: any) => w.id === workoutId);
        }

        if (!workout) {
          throw new Error("Workout not found");
        }

        // Set workout fields
        setFocus(workout.focus as WorkoutFocus);
        setWorkoutDate(workout.workout_date);
        setNotes(workout.notes || "");
        setCurrentWorkoutId(workout.id);

        // Try to load workout exercises from Supabase first
        let workoutExercises: any[] = [];
        try {
          const { data } = await client
            .from("workout_exercises")
            .select("*, exercise:exercises(name)")
            .eq("workout_id", workoutId);
          workoutExercises = data || [];
        } catch {
          // Supabase failed, ignore and try localStorage
        }

        // Fall back to localStorage if Supabase didn't return data
        if (workoutExercises.length === 0 && typeof window !== 'undefined') {
          const mockWorkoutExercises = JSON.parse(localStorage.getItem('mock-workout-exercises') || '[]');
          workoutExercises = mockWorkoutExercises.filter((we: any) => we.workout_id === workoutId);
        }

        // Group exercises by exercise_id and convert to ExerciseSet format
        // For cardio workouts and Abs, weight stores distance and reps stores time
        const isCardioWorkout = (workout.focus as WorkoutFocus) === "Cardio";
        const exercisesByExerciseId = workoutExercises.reduce((acc, we) => {
          // Must match per-exercise save logic (saveExercise): only "Core" uses time→reps column mapping.
          // Do not treat weight===0 as Core — bodyweight exercises (e.g. Pull-ups) store reps in `reps`.
          const exerciseName = (
            we.exercise_name ??
            (we.exercise && typeof we.exercise === "object" && "name" in we.exercise
              ? (we.exercise as { name?: string }).name
              : undefined) ??
            ""
          ).trim();
          const isCoreExercise = exerciseName === "Core";
          if (!acc[we.exercise_id]) {
            acc[we.exercise_id] = {
              exerciseId: we.exercise_id,
              sets: [],
              restInterval: we.rest_interval?.toString() || "60", // Default to 60 seconds
            };
          }
          if (isCardioWorkout) {
            if (exerciseName === "Swimming") {
              acc[we.exercise_id].sets.push({
                reps: 0,
                weight: 0,
                distance: we.weight,
                time: we.reps,
                swimSets: Math.max(1, we.rest_interval ?? 1),
              });
            } else {
              acc[we.exercise_id].sets.push({
                reps: 0,
                weight: 0,
                distance: we.weight,
                time: we.reps,
              });
            }
          } else if (isCoreExercise) {
            acc[we.exercise_id].sets.push({
              reps: 0,
              weight: 0,
              distance: 0,
              time: we.reps,
            });
          } else {
            acc[we.exercise_id].sets.push({
              reps: we.reps,
              weight: we.weight,
              distance: 0,
              time: 0,
            });
          }
          return acc;
        }, {} as Record<string, ExerciseSet>);

        setSelectedExercises(Object.values(exercisesByExerciseId));
      } catch (err: any) {
        setError(err.message || "Failed to load workout");
      } finally {
        setIsLoadingWorkout(false);
      }
    };

    loadWorkout();
  }, [workoutId]);

  // Update selected exercises when exercises list becomes available (new workouts only — never clobber loaded edit data)
  useEffect(() => {
    if (workoutId) return;
    if (exercises.length > 0) {
      setSelectedExercises((prev) =>
        prev.map((exercise) => {
          if (!exercise.exerciseId || !exercises.find((e) => e.id === exercise.exerciseId)) {
            return { ...exercise, exerciseId: exercises[0].id };
          }
          return exercise;
        })
      );
    }
  }, [exercises, workoutId]);

  const addExercise = () => {
    // Always add an exercise, even if list is empty (will show "No exercises available")
    const defaultExerciseId = exercises.length > 0 ? exercises[0].id : "";
    setSelectedExercises((prev) => [
      ...prev,
      {
        exerciseId: defaultExerciseId,
        sets: [{ reps: 0, weight: 0, distance: 0, time: 0, swimSets: 1 }],
        restInterval: "60", // Default to 60 seconds
      },
    ]);
  };

  const removeExercise = (index: number) => {
    setSelectedExercises(prev => prev.filter((_, i) => i !== index));
  };

  const addSet = (exerciseIndex: number) => {
    setSelectedExercises(prev =>
      prev.map((exercise, idx) => {
        if (idx !== exerciseIndex) return exercise;
        return {
          ...exercise,
          sets: [...exercise.sets, { reps: 0, weight: 0, distance: 0, time: 0, swimSets: 1 }],
        };
      })
    );
    // Remove from saved exercises when sets change
    setSavedExercises(prev => {
      const newSet = new Set(prev);
      newSet.delete(exerciseIndex);
      return newSet;
    });
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    setSelectedExercises(prev =>
      prev.map((exercise, idx) => {
        if (idx !== exerciseIndex) return exercise;
        return {
          ...exercise,
          sets: exercise.sets.filter((_, i) => i !== setIndex),
        };
      })
    );
    // Remove from saved exercises when sets change
    setSavedExercises(prev => {
      const newSet = new Set(prev);
      newSet.delete(exerciseIndex);
      return newSet;
    });
  };

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: "reps" | "weight" | "distance" | "time" | "pace" | "swimSets",
    value: number
  ) => {
    setSelectedExercises(prev =>
      prev.map((exercise, eIdx) => {
        if (eIdx !== exerciseIndex) return exercise;
        return {
          ...exercise,
          sets: exercise.sets.map((set, sIdx) => {
            if (sIdx !== setIndex) return set;
            return { ...set, [field]: value };
          }),
        };
      })
    );
    // Remove from saved exercises when set data changes
    setSavedExercises(prev => {
      const newSet = new Set(prev);
      newSet.delete(exerciseIndex);
      return newSet;
    });
  };

  const updateExercise = (exerciseIndex: number, exerciseId: string) => {
    setSelectedExercises(prev =>
      prev.map((exercise, idx) => {
        if (idx !== exerciseIndex) return exercise;
        return { ...exercise, exerciseId };
      })
    );
    // Remove from saved exercises when exercise changes
    setSavedExercises(prev => {
      const newSet = new Set(prev);
      newSet.delete(exerciseIndex);
      return newSet;
    });
  };

  const updateRestInterval = (exerciseIndex: number, interval: string) => {
    setSelectedExercises(prev =>
      prev.map((exercise, idx) => {
        if (idx !== exerciseIndex) return exercise;
        return { ...exercise, restInterval: interval };
      })
    );
    // Remove from saved exercises when interval changes
    setSavedExercises(prev => {
      const newSet = new Set(prev);
      newSet.delete(exerciseIndex);
      return newSet;
    });
  };

  const saveExercise = async (exerciseIndex: number) => {
    const exerciseSet = selectedExercises[exerciseIndex];
    
    if (!exerciseSet || !exerciseSet.exerciseId || exerciseSet.sets.length === 0) {
      setError("Please select an exercise and add at least one set");
      return;
    }

    setSavingExercise(exerciseIndex);
    setError(null);

    try {
      const client = createClient();

      const isMockMode = isInMockMode();
      
      // Use the userId from Auth0 hook, or fall back to mock user in mock mode
      const effectiveUserId = userId || (isMockMode ? 'mock-user-id' : null);
      
      if (!effectiveUserId) {
        throw new Error("Not authenticated");
      }
      let workoutIdToUse = currentWorkoutId || workoutId;

      // Create workout if it doesn't exist
      if (!workoutIdToUse) {
        if (isMockMode) {
          // Create mock workout in localStorage
          const mockWorkouts = typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('mock-workouts') || '[]')
            : [];
          const newWorkout = {
            id: `mock-${Date.now()}`,
            user_id: effectiveUserId,
            workout_date: workoutDate,
            focus,
            notes: notes || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          mockWorkouts.push(newWorkout);
          if (typeof window !== 'undefined') {
            localStorage.setItem('mock-workouts', JSON.stringify(mockWorkouts));
          }
          workoutIdToUse = newWorkout.id;
          setCurrentWorkoutId(newWorkout.id);
        } else {
          const { data: workout, error: workoutError } = await client
            .from("workouts")
            .insert({
              user_id: effectiveUserId,
              workout_date: workoutDate,
              focus,
              notes: notes || null,
            })
            .select()
            .single();
          
          if (workoutError) throw workoutError;
          if (!workout || !workout.id) throw new Error("Failed to create workout");
          workoutIdToUse = workout.id;
          setCurrentWorkoutId(workout.id);
        }
      } else {
        // Update existing workout metadata
        if (isMockMode) {
          const mockWorkouts = typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('mock-workouts') || '[]')
            : [];
          const workoutIndex = mockWorkouts.findIndex((w: any) => w.id === workoutIdToUse);
          if (workoutIndex !== -1) {
            mockWorkouts[workoutIndex] = {
              ...mockWorkouts[workoutIndex],
              workout_date: workoutDate,
              focus,
              notes: notes || null,
              updated_at: new Date().toISOString(),
            };
            if (typeof window !== 'undefined') {
              localStorage.setItem('mock-workouts', JSON.stringify(mockWorkouts));
            }
          }
        } else {
          const { error: workoutError } = await client
            .from("workouts")
            .update({
              workout_date: workoutDate,
              focus,
              notes: notes || null,
            })
            .eq("id", workoutIdToUse);
          
          if (workoutError) throw workoutError;
        }
      }

      // Delete existing workout exercises for this exercise_id
      if (isMockMode) {
        const mockWorkoutExercises = typeof window !== 'undefined'
          ? JSON.parse(localStorage.getItem('mock-workout-exercises') || '[]')
          : [];
        const filtered = mockWorkoutExercises.filter(
          (we: any) => !(we.workout_id === workoutIdToUse && we.exercise_id === exerciseSet.exerciseId)
        );
        if (typeof window !== 'undefined') {
          localStorage.setItem('mock-workout-exercises', JSON.stringify(filtered));
        }
      } else {
        const { error: deleteError } = await client
          .from("workout_exercises")
          .delete()
          .eq("workout_id", workoutIdToUse)
          .eq("exercise_id", exerciseSet.exerciseId);

        if (deleteError) throw deleteError;
      }

      // Insert new workout exercises for this exercise
      // For cardio and Abs, we store time in reps field. For cardio, we also store distance in weight field
      const isCardioWorkout = focus === "Cardio";
      const exerciseName = exercises.find(e => e.id === exerciseSet.exerciseId)?.name;
      const isCoreExercise = exerciseName === "Core";
      const isSwimming = exerciseName === "Swimming";
      const workoutExercises = exerciseSet.sets.map((set, setIndex) => ({
        workout_id: workoutIdToUse,
        exercise_id: exerciseSet.exerciseId,
        set_number: setIndex + 1,
        reps: isCardioWorkout || isCoreExercise ? (set.time ?? 0) : set.reps,
        weight: isCardioWorkout
          ? (set.distance ?? 0)
          : isCoreExercise
            ? 0
            : set.weight,
        rest_interval: isSwimming
          ? Math.max(1, Math.round(set.swimSets ?? 1))
          : parseInt(exerciseSet.restInterval) || 60,
      }));

      if (workoutExercises.length > 0) {
        if (isMockMode) {
          const mockWorkoutExercises = typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('mock-workout-exercises') || '[]')
            : [];
          // Find the exercise name to store with the workout exercise
          const exerciseName = exercises.find(e => e.id === exerciseSet.exerciseId)?.name || 'Unknown Exercise';
          const newExercises = workoutExercises.map((we, idx) => ({
            ...we,
            id: `mock-we-${Date.now()}-${idx}`,
            created_at: new Date().toISOString(),
            exercise_name: exerciseName, // Store exercise name for easy lookup
          }));
          mockWorkoutExercises.push(...newExercises);
          if (typeof window !== 'undefined') {
            localStorage.setItem('mock-workout-exercises', JSON.stringify(mockWorkoutExercises));
          }
        } else {
          const { error: exercisesError } = await client
            .from("workout_exercises")
            .insert(workoutExercises);

          if (exercisesError) throw exercisesError;
        }
      }

      // Update exercise usage count (only if we have a user ID)
      if (userId) {
        await updateExerciseUsage(client, userId, exerciseSet.exerciseId, isMockMode);
      }

      // Mark exercise as saved
      setSavedExercises(prev => new Set(prev).add(exerciseIndex));

      // Dispatch event to update dashboard stats
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('workoutUpdated'));
      }
    } catch (err: any) {
      setError(err.message || "Failed to save exercise");
    } finally {
      setSavingExercise(null);
    }
  };

  // Update exercise usage count for personalized sorting
  const updateExerciseUsage = async (client: any, userId: string, exerciseId: string, isMockMode: boolean) => {
    try {
      if (isMockMode) {
        // Update localStorage for mock mode
        if (typeof window !== 'undefined') {
          const mockUsage = JSON.parse(localStorage.getItem('mock-exercise-usage') || '{}');
          if (!mockUsage[userId]) {
            mockUsage[userId] = {};
          }
          mockUsage[userId][exerciseId] = (mockUsage[userId][exerciseId] || 0) + 1;
          localStorage.setItem('mock-exercise-usage', JSON.stringify(mockUsage));
          
          // Update local state
          setExerciseUsage(prev => {
            const newMap = new Map(prev);
            newMap.set(exerciseId, (prev.get(exerciseId) || 0) + 1);
            return newMap;
          });
        }
      } else {
        // Upsert to increment usage count in database
        const currentCount = exerciseUsage.get(exerciseId) || 0;
        const { error } = await client
          .from("user_exercise_usage")
          .upsert({
            user_id: userId,
            exercise_id: exerciseId,
            usage_count: currentCount + 1,
            last_used_at: new Date().toISOString(),
          }, { onConflict: 'user_id,exercise_id' });
        
        if (!error) {
          // Update local state
          setExerciseUsage(prev => {
            const newMap = new Map(prev);
            newMap.set(exerciseId, currentCount + 1);
            return newMap;
          });
        }
      }
    } catch (err) {
      console.error("Failed to update exercise usage:", err);
    }
  };

  const computeWorkoutStats = (
    workoutExercises: (WorkoutExercise & { exercise: Exercise })[],
    workoutDate: string,
    workoutFocus: string
  ): WorkoutStats => {
    const isCardio = workoutFocus === "Cardio";
    const exerciseMap = new Map<string, {
      name: string;
      sets: number;
      bestWeight: number;
      bestReps: number;
      totalVolume: number;
      totalTime: number;
      totalDistance: number;
    }>();

    let totalSets = 0;
    let totalReps = 0;
    let totalVolume = 0;
    let totalTime = 0;
    let totalDistance = 0;

    for (const we of workoutExercises) {
      const name = we.exercise?.name || "Unknown";
      const isCoreExercise = name === "Core";
      const isSwimming = name === "Swimming";

      totalSets++;

      if (isCardio || isCoreExercise) {
        totalTime += we.reps;
        if (isCardio) totalDistance += we.weight;
      } else {
        totalReps += we.reps;
        totalVolume += we.reps * we.weight;
      }

      const existing = exerciseMap.get(name);
      if (existing) {
        existing.sets++;
        if (isCardio || isCoreExercise) {
          existing.totalTime += we.reps;
          if (isCardio) existing.totalDistance += we.weight;
        } else {
          existing.bestWeight = Math.max(existing.bestWeight, we.weight);
          existing.bestReps = Math.max(existing.bestReps, we.reps);
          existing.totalVolume += we.reps * we.weight;
        }
      } else {
        exerciseMap.set(name, {
          name,
          sets: 1,
          bestWeight: isCardio || isCoreExercise ? 0 : we.weight,
          bestReps: isCardio || isCoreExercise ? 0 : we.reps,
          totalVolume: isCardio || isCoreExercise ? 0 : we.reps * we.weight,
          totalTime: isCardio || isCoreExercise ? we.reps : 0,
          totalDistance: isCardio ? we.weight : 0,
        });
      }
    }

    return {
      totalSets,
      totalReps,
      totalVolume,
      totalTime,
      totalDistance,
      exerciseCount: exerciseMap.size,
      exerciseBreakdown: Array.from(exerciseMap.values()),
      date: workoutDate,
    };
  };

  const fetchPreviousWorkout = async (
    currentWorkoutId: string,
    focusType: string,
    effectiveUserId: string,
    isMockMode: boolean
  ): Promise<WorkoutStats | null> => {
    if (isMockMode) {
      const mockWorkouts = JSON.parse(localStorage.getItem('mock-workouts') || '[]');
      const mockExercises = JSON.parse(localStorage.getItem('mock-workout-exercises') || '[]');
      const sorted = mockWorkouts
        .filter((w: any) => w.focus === focusType && w.user_id === effectiveUserId && w.id !== currentWorkoutId)
        .sort((a: any, b: any) => new Date(b.workout_date).getTime() - new Date(a.workout_date).getTime());
      if (sorted.length === 0) return null;
      const prev = sorted[0];
      const prevExercises = mockExercises
        .filter((we: any) => we.workout_id === prev.id)
        .map((we: any) => ({
          ...we,
          exercise: exercises.find(e => e.id === we.exercise_id) || { id: we.exercise_id, name: we.exercise_name || "Unknown", muscle_group_id: "" },
        }));
      return computeWorkoutStats(prevExercises, prev.workout_date, prev.focus);
    }

    const client = createClient();
    const { data, error } = await client
      .from("workouts")
      .select("id, workout_date, focus, workout_exercises(id, workout_id, exercise_id, set_number, reps, weight, rest_interval, exercise:exercises(id, name, muscle_group_id))")
      .eq("user_id", effectiveUserId)
      .eq("focus", focusType)
      .neq("id", currentWorkoutId)
      .order("workout_date", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    const exercisesData = (data.workout_exercises || []).map((we: any) => ({
      ...we,
      exercise: we.exercise,
    }));

    return computeWorkoutStats(exercisesData, data.workout_date, data.focus);
  };

  const buildCurrentStats = (
    exercisesToSave: ExerciseSet[],
    date: string,
    workoutFocus: string
  ): WorkoutStats => {
    const isCardio = workoutFocus === "Cardio";
    const fakeExercises: (WorkoutExercise & { exercise: Exercise })[] = exercisesToSave.flatMap((es) => {
      const exercise = exercises.find(e => e.id === es.exerciseId);
      const name = exercise?.name || "Unknown";
      const isCoreExercise = name === "Core";
      return es.sets.map((set, idx) => ({
        id: "",
        workout_id: "",
        exercise_id: es.exerciseId,
        set_number: idx + 1,
        reps: isCardio || isCoreExercise ? (set.time ?? 0) : set.reps,
        weight: isCardio ? (set.distance ?? 0) : isCoreExercise ? 0 : set.weight,
        exercise: exercise || { id: es.exerciseId, name: "Unknown", muscle_group_id: "" },
      }));
    });
    return computeWorkoutStats(fakeExercises, date, workoutFocus);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Use the ref to ensure we have the latest value
    const exercisesToSave = selectedExercisesRef.current;

    try {
      const client = createClient();

      // For testing: allow saving workouts even without real authentication
      const isMockMode = isInMockMode();
      
      // Use the userId from Auth0 hook, or fall back to mock user in mock mode
      const effectiveUserId = userId || (isMockMode ? 'mock-user-id' : null);
      
      if (!effectiveUserId) {
        throw new Error("Not authenticated");
      }

      let workoutIdToUse = currentWorkoutId || workoutId;

      if (workoutIdToUse) {
        // Update existing workout
        if (isMockMode) {
          const mockWorkouts = typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('mock-workouts') || '[]')
            : [];
          const workoutIndex = mockWorkouts.findIndex((w: any) => w.id === workoutIdToUse);
          if (workoutIndex !== -1) {
            mockWorkouts[workoutIndex] = {
              ...mockWorkouts[workoutIndex],
              workout_date: workoutDate,
              focus,
              notes: notes || null,
              updated_at: new Date().toISOString(),
            };
            if (typeof window !== 'undefined') {
              localStorage.setItem('mock-workouts', JSON.stringify(mockWorkouts));
            }
          }

          // Delete existing workout exercises
          const mockWorkoutExercises = typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('mock-workout-exercises') || '[]')
            : [];
          const filtered = mockWorkoutExercises.filter(
            (we: any) => we.workout_id !== workoutIdToUse
          );
          if (typeof window !== 'undefined') {
            localStorage.setItem('mock-workout-exercises', JSON.stringify(filtered));
          }
        } else {
          const { error: workoutError } = await client
            .from("workouts")
            .update({
              workout_date: workoutDate,
              focus,
              notes: notes || null,
            })
            .eq("id", workoutIdToUse);
          
          if (workoutError) {
            throw workoutError;
          }

          // Delete existing workout exercises
          const { error: deleteError } = await client
            .from("workout_exercises")
            .delete()
            .eq("workout_id", workoutIdToUse);

          if (deleteError) {
            throw deleteError;
          }
        }
      } else {
        // Create new workout
        if (isMockMode) {
          const mockWorkouts = typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('mock-workouts') || '[]')
            : [];
          const newWorkout = {
            id: `mock-${Date.now()}`,
            user_id: effectiveUserId,
            workout_date: workoutDate,
            focus,
            notes: notes || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          mockWorkouts.push(newWorkout);
          if (typeof window !== 'undefined') {
            localStorage.setItem('mock-workouts', JSON.stringify(mockWorkouts));
          }
          workoutIdToUse = newWorkout.id;
          setCurrentWorkoutId(newWorkout.id);
        } else {
          const { data: workout, error: workoutError } = await client
            .from("workouts")
            .insert({
              user_id: effectiveUserId,
              workout_date: workoutDate,
              focus,
              notes: notes || null,
            })
            .select()
            .single();
          
          if (workoutError) {
            throw workoutError;
          }

          if (!workout || !workout.id) {
            throw new Error("Failed to create workout");
          }

          workoutIdToUse = workout.id;
          setCurrentWorkoutId(workout.id);
        }
      }

      // Create workout exercises
      // For cardio and Abs, we store time in reps field. For cardio, we also store distance in weight field
      const isCardioWorkout = focus === "Cardio";
      const workoutExercises = exercisesToSave.flatMap((exercise) => {
        const exerciseName = exercises.find(e => e.id === exercise.exerciseId)?.name;
        const isCoreExercise = exerciseName === "Core";
        const isSwimming = exerciseName === "Swimming";
        return exercise.sets.map((set, setIndex) => {
          return {
            workout_id: workoutIdToUse,
            exercise_id: exercise.exerciseId,
            set_number: setIndex + 1,
            reps: isCardioWorkout || isCoreExercise ? (set.time ?? 0) : set.reps,
            weight: isCardioWorkout
              ? (set.distance ?? 0)
              : isCoreExercise
                ? 0
                : set.weight,
            rest_interval: isSwimming
              ? Math.max(1, Math.round(set.swimSets ?? 1))
              : parseInt(exercise.restInterval) || 60,
          };
        });
      });

      if (workoutExercises.length > 0) {
        if (isMockMode) {
          const mockWorkoutExercises = typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('mock-workout-exercises') || '[]')
            : [];
          // Add exercise_name only for mock mode (localStorage) - not in Supabase schema
          const newExercises = workoutExercises.map((we, idx) => {
            const exerciseName = exercises.find(e => e.id === we.exercise_id)?.name || 'Unknown Exercise';
            return {
              ...we,
              id: `mock-we-${Date.now()}-${idx}`,
              created_at: new Date().toISOString(),
              exercise_name: exerciseName,
            };
          });
          mockWorkoutExercises.push(...newExercises);
          if (typeof window !== 'undefined') {
            localStorage.setItem('mock-workout-exercises', JSON.stringify(mockWorkoutExercises));
          }
        } else {
          const { error: exercisesError } = await client
            .from("workout_exercises")
            .insert(workoutExercises);

          if (exercisesError) {
            console.error("Supabase save error:", exercisesError);
            throw exercisesError;
          }
        }
        
        // Update usage counts for all exercises in the workout (only if we have a user ID)
        if (userId) {
          const uniqueExerciseIds = [...new Set(exercisesToSave.map(e => e.exerciseId))];
          for (const exerciseId of uniqueExerciseIds) {
            await updateExerciseUsage(client, userId, exerciseId, isMockMode);
          }
        }
      }

      // Dispatch event to update dashboard stats
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('workoutUpdated'));
      }

      // Build stats for the workout we just saved
      const saved = buildCurrentStats(exercisesToSave, workoutDate, focus);
      setCurrentStats(saved);

      // Fetch previous workout of same type for comparison
      try {
        const prev = await fetchPreviousWorkout(
          workoutIdToUse!,
          focus,
          effectiveUserId,
          isMockMode
        );
        setPreviousStats(prev);
      } catch {
        setPreviousStats(null);
      }

      setLoading(false);
      setShowComparison(true);
    } catch (err: any) {
      console.error("Save workout failed:", err);
      setError(err.message || "Failed to save workout");
      setLoading(false);
    }
  };

  if (isLoadingWorkout || (workoutId && exercisesLoadedForFocus !== focus)) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading workout...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Workout Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={workoutDate}
              onChange={(e) => setWorkoutDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="focus">Focus</Label>
            <Select
              id="focus"
              value={focus}
              onChange={(e) => setFocus(e.target.value as WorkoutFocus)}
            >
              {focusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did you feel? Any observations?"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <CardTitle>Exercises</CardTitle>
            <Button
              type="button"
              variant="outline"
              onClick={addExercise}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Exercise
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {selectedExercises.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Click &quot;Add Exercise&quot; to start logging your workout
            </p>
          )}

          {selectedExercises.map((exerciseSet, exerciseIndex) => {
            const exercise = exercises.find((e) => e.id === exerciseSet.exerciseId);
            const isCollapsed = collapsedExercises.has(exerciseIndex);
            const toggleCollapse = () => {
              setCollapsedExercises(prev => {
                const newSet = new Set(prev);
                if (newSet.has(exerciseIndex)) {
                  newSet.delete(exerciseIndex);
                } else {
                  newSet.add(exerciseIndex);
                }
                return newSet;
              });
            };
            return (
              <Card key={exerciseIndex}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={toggleCollapse}
                      className="shrink-0"
                    >
                      <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                    </Button>
                    <div className="flex-1 space-y-2">
                      <Label>Exercise</Label>
                      <Select
                        value={exerciseSet.exerciseId || ""}
                        onChange={(e) =>
                          updateExercise(exerciseIndex, e.target.value)
                        }
                        className="w-full"
                      >
                        {exercises.length === 0 ? (
                          <option value="">No exercises available</option>
                        ) : (
                          exercises.map((ex) => (
                            <option key={ex.id} value={ex.id}>
                              {ex.name}
                            </option>
                          ))
                        )}
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExercise(exerciseIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                {!isCollapsed && (
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <Label>
                        {exercise?.name === "Swimming"
                          ? "Session"
                          : focus === "Cardio" || exercise?.name === "Core"
                            ? "Session"
                            : "Sets"}
                      </Label>
                      {(focus !== "Cardio" || exercise?.name === "Swimming") &&
                        exercise?.name !== "Core" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addSet(exerciseIndex)}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Add Set
                        </Button>
                      )}
                    </div>
                    {exercise?.name === "Swimming" && (
                      <div className="flex items-center gap-4 px-3 text-xs font-medium text-muted-foreground">
                        <div className="w-12 shrink-0" aria-hidden />
                        <div className="flex-1 min-w-0">Sets</div>
                        <div className="flex-1 min-w-0">Distance (yd)</div>
                        <div className="flex-1 min-w-0">Interval</div>
                      </div>
                    )}
                    {exerciseSet.sets.map((set, setIndex) => (
                      <div
                        key={setIndex}
                        className="flex items-center gap-4 p-3 border rounded-md"
                      >
                        <div className="font-medium w-12">{focus === "Cardio" || exercise?.name === "Core" ? "" : `Set ${setIndex + 1}`}</div>
                        {exercise?.name === "Core" ? (
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Time</Label>
                            <Input
                              type="text"
                              inputMode="numeric"
                              maxLength={5}
                              value={getTimeDisplayValue(exerciseIndex, setIndex, set.time ?? 0)}
                              onChange={(e) => handleTimeInputChange(exerciseIndex, setIndex, e.target.value)}
                              onBlur={() => handleTimeInputBlur(exerciseIndex, setIndex)}
                              placeholder="0:00"
                            />
                          </div>
                        ) : focus === "Cardio" && exercise?.name === "Swimming" ? (
                          <>
                            <div className="flex-1 space-y-1">
                              <Label className="sr-only">Sets</Label>
                              <Input
                                type="number"
                                min="1"
                                step="1"
                                value={(set.swimSets ?? 1).toString()}
                                onChange={(e) =>
                                  updateSet(
                                    exerciseIndex,
                                    setIndex,
                                    "swimSets",
                                    Math.max(1, parseInt(e.target.value, 10) || 1)
                                  )
                                }
                                placeholder="1"
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <Label className="sr-only">Distance (yd)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                value={(set.distance ?? 0).toString()}
                                onChange={(e) =>
                                  updateSet(
                                    exerciseIndex,
                                    setIndex,
                                    "distance",
                                    parseInt(e.target.value, 10) || 0
                                  )
                                }
                                placeholder="0"
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <Label className="sr-only">Interval (MM:SS)</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                maxLength={5}
                                value={getTimeDisplayValue(
                                  exerciseIndex,
                                  setIndex,
                                  set.time ?? 0
                                )}
                                onChange={(e) =>
                                  handleTimeInputChange(
                                    exerciseIndex,
                                    setIndex,
                                    e.target.value
                                  )
                                }
                                onBlur={() => handleTimeInputBlur(exerciseIndex, setIndex)}
                                placeholder="0:00"
                              />
                            </div>
                          </>
                        ) : focus === "Cardio" && exercise?.name === "Running" ? (
                          <>
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs">Distance (miles)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                value={(set.distance ?? 0).toString()}
                                onChange={(e) =>
                                  updateSet(
                                    exerciseIndex,
                                    setIndex,
                                    "distance",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                placeholder="0"
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs">Pace (min/mi)</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                maxLength={5}
                                value={getPaceDisplayValue(exerciseIndex, setIndex, set.pace ?? 0)}
                                onChange={(e) => handlePaceInputChange(exerciseIndex, setIndex, e.target.value)}
                                onBlur={() => handlePaceInputBlur(exerciseIndex, setIndex)}
                                placeholder="0:00"
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs">Time</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                maxLength={5}
                                value={getTimeDisplayValue(exerciseIndex, setIndex, set.time ?? 0)}
                                onChange={(e) => handleTimeInputChange(exerciseIndex, setIndex, e.target.value)}
                                onBlur={() => handleTimeInputBlur(exerciseIndex, setIndex)}
                                placeholder="0:00"
                              />
                            </div>
                          </>
                        ) : focus === "Cardio" && exercise?.name === "Peloton" ? (
                          <>
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs">Time</Label>
                              <Select
                                value={(set.time ?? 0).toString()}
                                onChange={(e) =>
                                  updateSet(
                                    exerciseIndex,
                                    setIndex,
                                    "time",
                                    parseInt(e.target.value) || 0
                                  )
                                }
                              >
                                <option value="0">Select time</option>
                                <option value="1200">20 mins</option>
                                <option value="1800">30 mins</option>
                                <option value="2700">45 mins</option>
                              </Select>
                            </div>
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs">Output (kJ)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                value={(set.distance ?? 0).toString()}
                                onChange={(e) =>
                                  updateSet(
                                    exerciseIndex,
                                    setIndex,
                                    "distance",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                placeholder="0"
                              />
                            </div>
                          </>
                        ) : focus === "Cardio" ? (
                          <>
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs">Time</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                maxLength={5}
                                value={getTimeDisplayValue(exerciseIndex, setIndex, set.time ?? 0)}
                                onChange={(e) => handleTimeInputChange(exerciseIndex, setIndex, e.target.value)}
                                onBlur={() => handleTimeInputBlur(exerciseIndex, setIndex)}
                                placeholder="0:00"
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs">Distance (miles)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                value={(set.distance ?? 0).toString()}
                                onChange={(e) =>
                                  updateSet(
                                    exerciseIndex,
                                    setIndex,
                                    "distance",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                placeholder="0"
                              />
                            </div>
                          </>
                        ) : exercise?.name === "Pull-ups" ? (
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Reps</Label>
                            <Input
                              type="number"
                              min="0"
                              value={set.reps.toString()}
                              onChange={(e) =>
                                updateSet(
                                  exerciseIndex,
                                  setIndex,
                                  "reps",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              placeholder="0"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs">Weight (lbs)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={set.weight.toString()}
                                onChange={(e) =>
                                  updateSet(
                                    exerciseIndex,
                                    setIndex,
                                    "weight",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                placeholder="0"
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs">Reps</Label>
                              <Input
                                type="number"
                                min="0"
                                value={set.reps.toString()}
                                onChange={(e) =>
                                  updateSet(
                                    exerciseIndex,
                                    setIndex,
                                    "reps",
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                placeholder="0"
                              />
                            </div>
                          </>
                        )}
                        {exerciseSet.sets.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSet(exerciseIndex, setIndex)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {focus !== "Cardio" && exercise?.name !== "Core" && (
                    <div className="space-y-2 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Label>Intervals</Label>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Rest time between sets
                      </p>
                      <Select
                        value={exerciseSet.restInterval || "60"}
                        onChange={(e) => updateRestInterval(exerciseIndex, e.target.value)}
                        className="w-full"
                      >
                        {restIntervalOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      type="button"
                      variant={savedExercises.has(exerciseIndex) ? "outline" : "default"}
                      onClick={() => saveExercise(exerciseIndex)}
                      disabled={savingExercise === exerciseIndex || !exerciseSet.exerciseId || exerciseSet.sets.length === 0}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      {savingExercise === exerciseIndex ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          <span>Saving...</span>
                        </>
                      ) : savedExercises.has(exerciseIndex) ? (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Saved</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Quick Save</span>
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
                )}
              </Card>
            );
          })}

          <Button
            type="button"
            variant="outline"
            onClick={addExercise}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Exercise
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-4 rounded-md">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading || selectedExercises.length === 0}>
          {loading ? (workoutId ? "Updating..." : "Saving...") : (workoutId ? "Update Workout" : "Save Workout")}
        </Button>
      </div>

      {showComparison && currentStats && (
        <WorkoutComparisonOverlay
          currentStats={currentStats}
          previousStats={previousStats}
          focus={focus}
          formatTime={formatTimeDisplay}
          onClose={() => {
            setShowComparison(false);
            router.push("/dashboard/history");
            router.refresh();
          }}
        />
      )}
    </form>
  );
}

function StatDelta({ current, previous, unit, higherIsBetter = true, formatFn }: {
  current: number;
  previous: number;
  unit?: string;
  higherIsBetter?: boolean;
  formatFn?: (v: number) => string;
}) {
  const diff = current - previous;
  if (diff === 0) return <span className="text-muted-foreground flex items-center gap-1"><Minus className="h-3 w-3" /> Same</span>;
  const improved = higherIsBetter ? diff > 0 : diff < 0;
  const display = formatFn ? formatFn(Math.abs(diff)) : Math.abs(diff).toLocaleString();
  return (
    <span className={`flex items-center gap-1 font-medium ${improved ? "text-green-500" : "text-orange-500"}`}>
      {improved ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {diff > 0 ? "+" : "-"}{display}{unit ? ` ${unit}` : ""}
    </span>
  );
}

function WorkoutComparisonOverlay({ currentStats, previousStats, focus, formatTime, onClose }: {
  currentStats: NonNullable<ReturnType<typeof Object>>;
  previousStats: NonNullable<ReturnType<typeof Object>> | null;
  focus: string;
  formatTime: (s: number) => string;
  onClose: () => void;
}) {
  const curr = currentStats as any;
  const prev = previousStats as any;
  const isCardio = focus === "Cardio";

  const formatDistance = (d: number) => d % 1 === 0 ? d.toString() : d.toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/15 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Great job!</h2>
                <p className="text-sm text-muted-foreground">
                  {prev
                    ? `Here's how you did compared to your last ${focus} workout`
                    : `Here's your ${focus} workout summary`}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Overview Stats */}
          <div className={`grid gap-3 ${isCardio ? "grid-cols-2" : "grid-cols-3"}`}>
            {!isCardio && (
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{curr.totalVolume.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Volume (lbs)</p>
                {prev && (
                  <div className="mt-1 text-xs">
                    <StatDelta current={curr.totalVolume} previous={prev.totalVolume} unit="lbs" />
                  </div>
                )}
              </div>
            )}
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{curr.totalSets}</p>
              <p className="text-xs text-muted-foreground">Total Sets</p>
              {prev && (
                <div className="mt-1 text-xs">
                  <StatDelta current={curr.totalSets} previous={prev.totalSets} />
                </div>
              )}
            </div>
            {isCardio ? (
              <>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{formatTime(curr.totalTime) || "0:00"}</p>
                  <p className="text-xs text-muted-foreground">Total Time</p>
                  {prev && (
                    <div className="mt-1 text-xs">
                      <StatDelta current={curr.totalTime} previous={prev.totalTime} formatFn={formatTime} />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{curr.totalReps}</p>
                <p className="text-xs text-muted-foreground">Total Reps</p>
                {prev && (
                  <div className="mt-1 text-xs">
                    <StatDelta current={curr.totalReps} previous={prev.totalReps} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Per-exercise breakdown */}
          {curr.exerciseBreakdown.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Exercise Breakdown</h3>
              <div className="space-y-2">
                {curr.exerciseBreakdown.map((ex: any, i: number) => {
                  const prevEx = prev?.exerciseBreakdown?.find((p: any) => p.name === ex.name);
                  const isCoreExercise = ex.name === "Core";
                  return (
                    <div key={i} className="bg-muted/30 rounded-lg p-3">
                      <p className="font-medium text-sm mb-2">{ex.name}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Sets: </span>
                          <span className="font-medium">{ex.sets}</span>
                          {prevEx && prevEx.sets !== ex.sets && (
                            <span className={ex.sets > prevEx.sets ? " text-green-500" : " text-orange-500"}>
                              {" "}{ex.sets > prevEx.sets ? "+" : ""}{ex.sets - prevEx.sets}
                            </span>
                          )}
                        </div>
                        {(isCardio || isCoreExercise) ? (
                          <>
                            <div>
                              <span className="text-muted-foreground">Time: </span>
                              <span className="font-medium">{formatTime(ex.totalTime) || "0:00"}</span>
                            </div>
                            {isCardio && (
                              <div>
                                <span className="text-muted-foreground">Dist: </span>
                                <span className="font-medium">{formatDistance(ex.totalDistance)}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div>
                              <span className="text-muted-foreground">Best: </span>
                              <span className="font-medium">{ex.bestWeight} lbs x {ex.bestReps}</span>
                              {prevEx && (ex.bestWeight !== prevEx.bestWeight) && (
                                <span className={ex.bestWeight > prevEx.bestWeight ? " text-green-500" : " text-orange-500"}>
                                  {" "}{ex.bestWeight > prevEx.bestWeight ? "\u2191" : "\u2193"}
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Vol: </span>
                              <span className="font-medium">{ex.totalVolume.toLocaleString()}</span>
                              {prevEx && prevEx.totalVolume !== ex.totalVolume && (
                                <span className={ex.totalVolume > prevEx.totalVolume ? " text-green-500" : " text-orange-500"}>
                                  {" "}{ex.totalVolume > prevEx.totalVolume ? "+" : ""}{(ex.totalVolume - prevEx.totalVolume).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {prev && (
            <p className="text-xs text-muted-foreground text-center">
              Compared to your {focus} workout on {new Date(prev.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2"
            >
              View History
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

