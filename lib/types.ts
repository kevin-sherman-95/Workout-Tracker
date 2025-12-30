export interface MuscleGroup {
  id: string;
  name: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscle_group_id: string;
}

export interface Workout {
  id: string;
  user_id: string;
  workout_date: string;
  focus: string;
  notes?: string;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight: number;
  exercise?: Exercise;
}

export interface WorkoutWithExercises extends Workout {
  workout_exercises: (WorkoutExercise & { exercise: Exercise })[];
}

export type WorkoutFocus = 
  | "Chest / Shoulders / Triceps"
  | "Back / Biceps"
  | "Legs"
  | "Full Body"
  | "Cardio"
  | "Other";

