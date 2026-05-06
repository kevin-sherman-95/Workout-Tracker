export interface MuscleGroup {
  id: string;
  name: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscle_group_id: string;
  /** Present when exercises are loaded with a muscle_groups join */
  muscle_group?: MuscleGroup;
}

export interface Workout {
  id: string;
  user_id: string;
  workout_date: string;
  focus: string;
  notes?: string;
  body_weight?: number | null;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight: number;
  rest_interval?: number;
  created_at?: string;
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

