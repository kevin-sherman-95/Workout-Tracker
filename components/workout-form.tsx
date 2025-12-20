"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Check, Save, ChevronDown } from "lucide-react";
import type { Exercise, WorkoutFocus } from "@/lib/types";

interface ExerciseSet {
  exerciseId: string;
  sets: Array<{ reps: number; weight: number }>;
}

interface WorkoutFormProps {
  workoutId?: string;
  initialDate?: string;
}

export function WorkoutForm({ workoutId, initialDate }: WorkoutFormProps) {
  const router = useRouter();
  const [focus, setFocus] = useState<WorkoutFocus>("Chest/Triceps/Shoulders");
  const [workoutDate, setWorkoutDate] = useState(
    initialDate || new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<ExerciseSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingWorkout, setIsLoadingWorkout] = useState(!!workoutId);
  const [savedExercises, setSavedExercises] = useState<Set<number>>(new Set());
  const [savingExercise, setSavingExercise] = useState<number | null>(null);
  const [currentWorkoutId, setCurrentWorkoutId] = useState<string | undefined>(workoutId);
  const [collapsedExercises, setCollapsedExercises] = useState<Set<number>>(new Set());

  const focusOptions: WorkoutFocus[] = [
    "Chest/Triceps/Shoulders",
    "Back/Biceps",
    "Legs",
    "Full Body",
    "Cardio",
    "Other",
  ];

  // Get muscle groups for the selected focus
  const getMuscleGroupsForFocus = (focus: WorkoutFocus): string[] => {
    const mapping: Record<WorkoutFocus, string[]> = {
      "Chest/Triceps/Shoulders": ["Chest", "Triceps", "Shoulders"],
      "Back/Biceps": ["Back", "Biceps"],
      "Legs": ["Legs"],
      "Full Body": ["Chest", "Triceps", "Shoulders", "Back", "Biceps", "Legs", "Core"],
      "Cardio": ["Cardio"],
      "Other": [],
    };
    return mapping[focus] || [];
  };

  // Mock exercises for testing when Supabase is not configured
  const getMockExercises = (focus: WorkoutFocus): Exercise[] => {
    const mapping: Record<WorkoutFocus, string[]> = {
      "Chest/Triceps/Shoulders": [
        "Barbell Bench Press",
        "Dumbbell Bench Press",
        "Barbell Incline Bench Press",
        "Dumbbell Incline Bench Press",
        "Dumbbell Flyes",
        "Machine Flyes",
        "Dumbbell Shoulder Press",
        "Front Raises",
        "Lateral Raises",
        "Front x Lateral Raises",
        "Tricep Pushdowns",
        "Tricep Rope Pulldowns",
      ],
      "Back/Biceps": [
        "Deadlift",
        "Pull-ups",
        "Barbell Row",
        "Lat Pulldown",
        "Barbell Curl",
        "Dumbbell Curl",
      ],
      "Legs": [
        "Squats",
        "Split Squats",
        "Leg Press",
        "Romanian Deadlift",
        "Leg Curls",
        "Leg Extensions",
        "Lunges",
      ],
      "Full Body": [
        "Squats",
        "Bench Press",
        "Deadlift",
        "Pull-ups",
        "Overhead Press",
        "Plank",
      ],
      "Cardio": [
        "Running",
        "Cycling",
        "Rowing",
      ],
      "Other": [
        "Custom Exercise",
      ],
    };
    
    const exerciseNames = mapping[focus] || [];
    return exerciseNames.map((name, index) => ({
      id: `mock-${focus}-${index}`,
      name,
      muscle_group_id: `mock-mg-${index}`,
    }));
  };

  // Load exercises based on focus
  useEffect(() => {
    const loadExercises = async () => {
      const client = createClient();
      const muscleGroups = getMuscleGroupsForFocus(focus);
      if (muscleGroups.length === 0) {
        // Use mock exercises for testing
        const mockExercises = getMockExercises(focus);
        setExercises(mockExercises);
        
        // Store mock exercises in localStorage
        const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                          process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
        if (isMockMode && typeof window !== 'undefined') {
          const existingExercises = JSON.parse(localStorage.getItem('mock-exercises') || '[]');
          const existingIds = new Set(existingExercises.map((e: any) => e.id));
          const newExercises = mockExercises.filter((e: any) => !existingIds.has(e.id));
          if (newExercises.length > 0) {
            localStorage.setItem('mock-exercises', JSON.stringify([...existingExercises, ...newExercises]));
          }
        }
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

          const exercisesToUse = exerciseData && exerciseData.length > 0 ? exerciseData : getMockExercises(focus);
          
          // Store exercises in localStorage for mock mode
          const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                            process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
          if (isMockMode && typeof window !== 'undefined') {
            const existingExercises = JSON.parse(localStorage.getItem('mock-exercises') || '[]');
            const existingIds = new Set(existingExercises.map((e: any) => e.id));
            const newExercises = exercisesToUse.filter((e: any) => !existingIds.has(e.id));
            if (newExercises.length > 0) {
              localStorage.setItem('mock-exercises', JSON.stringify([...existingExercises, ...newExercises]));
            }
          }
          
          setExercises(exercisesToUse);
        } else {
          // Fallback to mock exercises if no data returned
          const mockExercises = getMockExercises(focus);
          setExercises(mockExercises);
          
          // Store mock exercises in localStorage
          const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                            process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
          if (isMockMode && typeof window !== 'undefined') {
            const existingExercises = JSON.parse(localStorage.getItem('mock-exercises') || '[]');
            const existingIds = new Set(existingExercises.map((e: any) => e.id));
            const newExercises = mockExercises.filter((e: any) => !existingIds.has(e.id));
            if (newExercises.length > 0) {
              localStorage.setItem('mock-exercises', JSON.stringify([...existingExercises, ...newExercises]));
            }
          }
        }
      } catch (error) {
        // If Supabase query fails, use mock exercises for testing
        const mockExercises = getMockExercises(focus);
        setExercises(mockExercises);
        
        // Store mock exercises in localStorage
        const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                          process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
        if (isMockMode && typeof window !== 'undefined') {
          const existingExercises = JSON.parse(localStorage.getItem('mock-exercises') || '[]');
          const existingIds = new Set(existingExercises.map((e: any) => e.id));
          const newExercises = mockExercises.filter((e: any) => !existingIds.has(e.id));
          if (newExercises.length > 0) {
            localStorage.setItem('mock-exercises', JSON.stringify([...existingExercises, ...newExercises]));
          }
        }
      }
    };

    loadExercises();
  }, [focus]);

  // Load existing workout data when editing
  useEffect(() => {
    const loadWorkout = async () => {
      if (!workoutId) return;

      setIsLoadingWorkout(true);
      try {
        const client = createClient();
        const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                          process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

        // Load workout
        let workout: any = null;
        if (isMockMode) {
          // Load from localStorage
          const mockWorkouts = typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('mock-workouts') || '[]')
            : [];
          workout = mockWorkouts.find((w: any) => w.id === workoutId);
        } else {
          const { data, error } = await client
            .from("workouts")
            .select("*")
            .eq("id", workoutId)
            .single();
          
          if (error) throw error;
          workout = data;
        }

        if (!workout) {
          throw new Error("Workout not found");
        }

        // Set workout fields
        setFocus(workout.focus as WorkoutFocus);
        setWorkoutDate(workout.workout_date);
        setNotes(workout.notes || "");
        setCurrentWorkoutId(workout.id);

        // Load workout exercises
        let workoutExercises: any[] = [];
        if (isMockMode) {
          const mockWorkoutExercises = typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('mock-workout-exercises') || '[]')
            : [];
          workoutExercises = mockWorkoutExercises.filter((we: any) => we.workout_id === workoutId);
        } else {
          const { data, error } = await client
            .from("workout_exercises")
            .select("*")
            .eq("workout_id", workoutId);
          
          if (error) throw error;
          workoutExercises = data || [];
        }

        // Group exercises by exercise_id and convert to ExerciseSet format
        const exercisesByExerciseId = workoutExercises.reduce((acc, we) => {
          if (!acc[we.exercise_id]) {
            acc[we.exercise_id] = {
              exerciseId: we.exercise_id,
              sets: [],
            };
          }
          acc[we.exercise_id].sets.push({
            reps: we.reps,
            weight: we.weight,
          });
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

  const addExercise = () => {
    // Always add an exercise, even if list is empty (will show "No exercises available")
    const defaultExerciseId = exercises.length > 0 ? exercises[0].id : "";
    setSelectedExercises((prev) => [
      ...prev,
      {
        exerciseId: defaultExerciseId,
        sets: [{ reps: 0, weight: 0 }],
      },
    ]);
  };

  const removeExercise = (index: number) => {
    setSelectedExercises(selectedExercises.filter((_, i) => i !== index));
  };

  const addSet = (exerciseIndex: number) => {
    const updated = [...selectedExercises];
    updated[exerciseIndex].sets.push({ reps: 0, weight: 0 });
    setSelectedExercises(updated);
    // Remove from saved exercises when sets change
    setSavedExercises(prev => {
      const newSet = new Set(prev);
      newSet.delete(exerciseIndex);
      return newSet;
    });
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...selectedExercises];
    updated[exerciseIndex].sets = updated[exerciseIndex].sets.filter(
      (_, i) => i !== setIndex
    );
    setSelectedExercises(updated);
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
    field: "reps" | "weight",
    value: number
  ) => {
    const updated = [...selectedExercises];
    updated[exerciseIndex].sets[setIndex][field] = value;
    setSelectedExercises(updated);
    // Remove from saved exercises when set data changes
    setSavedExercises(prev => {
      const newSet = new Set(prev);
      newSet.delete(exerciseIndex);
      return newSet;
    });
  };

  const updateExercise = (exerciseIndex: number, exerciseId: string) => {
    const updated = [...selectedExercises];
    updated[exerciseIndex].exerciseId = exerciseId;
    setSelectedExercises(updated);
    // Remove from saved exercises when exercise changes
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
      const {
        data: { user },
      } = await client.auth.getUser();

      const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
      
      if (!user && !isMockMode) {
        throw new Error("Not authenticated");
      }

      const userId = user?.id || 'mock-user-id';
      let workoutIdToUse = currentWorkoutId || workoutId;

      // Create workout if it doesn't exist
      if (!workoutIdToUse) {
        if (isMockMode) {
          // Create mock workout in localStorage
          const mockWorkouts = typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('mock-workouts') || '[]')
            : [];
          const newWorkout = {
            id: `mock-workout-${Date.now()}`,
            user_id: userId,
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
              user_id: userId,
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
      const workoutExercises = exerciseSet.sets.map((set, setIndex) => ({
        workout_id: workoutIdToUse,
        exercise_id: exerciseSet.exerciseId,
        set_number: setIndex + 1,
        reps: set.reps,
        weight: set.weight,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const client = createClient();
      const {
        data: { user },
      } = await client.auth.getUser();

      // For testing: allow saving workouts even without real authentication
      const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                        process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
      
      if (!user && !isMockMode) {
        throw new Error("Not authenticated");
      }

      // Use mock user ID for testing if no real user
      const userId = user?.id || 'mock-user-id';

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
            id: `mock-workout-${Date.now()}`,
            user_id: userId,
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
              user_id: userId,
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
      const workoutExercises = selectedExercises.flatMap((exercise, exerciseIndex) =>
        exercise.sets.map((set, setIndex) => {
          const exerciseName = exercises.find(e => e.id === exercise.exerciseId)?.name || 'Unknown Exercise';
          return {
            workout_id: workoutIdToUse,
            exercise_id: exercise.exerciseId,
            exercise_name: exerciseName, // Store exercise name for easy lookup in mock mode
            set_number: setIndex + 1,
            reps: set.reps,
            weight: set.weight,
          };
        })
      );

      if (workoutExercises.length > 0) {
        if (isMockMode) {
          const mockWorkoutExercises = typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('mock-workout-exercises') || '[]')
            : [];
          const newExercises = workoutExercises.map((we, idx) => ({
            ...we,
            id: `mock-we-${Date.now()}-${idx}`,
            created_at: new Date().toISOString(),
          }));
          mockWorkoutExercises.push(...newExercises);
          if (typeof window !== 'undefined') {
            localStorage.setItem('mock-workout-exercises', JSON.stringify(mockWorkoutExercises));
          }
        } else {
          const { error: exercisesError } = await client
            .from("workout_exercises")
            .insert(workoutExercises);

          if (exercisesError) {
            throw exercisesError;
          }
        }
      }

      // Dispatch event to update dashboard stats
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('workoutUpdated'));
      }

      // Success - redirect to history to see the saved workout
      router.push("/dashboard/history");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to save workout");
      setLoading(false);
    }
  };

  if (isLoadingWorkout) {
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
                      <Label>Sets</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addSet(exerciseIndex)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add Set
                      </Button>
                    </div>
                    {exerciseSet.sets.map((set, setIndex) => (
                      <div
                        key={setIndex}
                        className="flex items-center gap-4 p-3 border rounded-md"
                      >
                        <div className="font-medium w-12">Set {setIndex + 1}</div>
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Weight (lbs)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            value={set.weight || ""}
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
                            value={set.reps || ""}
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
    </form>
  );
}

