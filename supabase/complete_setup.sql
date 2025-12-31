-- ================================================
-- COMPLETE DATABASE SETUP FOR CURSWOLL
-- Run this entire script in Supabase SQL Editor
-- ================================================

-- ================================================
-- MIGRATION 001: Initial Schema
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Muscle groups table
CREATE TABLE muscle_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exercises table
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  muscle_group_id UUID NOT NULL REFERENCES muscle_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, muscle_group_id)
);

-- Workouts table
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,  -- Will be changed to TEXT in next migration
  workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  focus TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workout exercises table (sets/reps/weight)
CREATE TABLE workout_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_workouts_workout_date ON workouts(workout_date);
CREATE INDEX idx_workout_exercises_workout_id ON workout_exercises(workout_id);
CREATE INDEX idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);
CREATE INDEX idx_exercises_muscle_group_id ON exercises(muscle_group_id);

-- Enable Row Level Security
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE muscle_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Public read access for muscle groups and exercises (they're shared)
CREATE POLICY "Anyone can view muscle groups"
  ON muscle_groups FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view exercises"
  ON exercises FOR SELECT
  USING (true);

-- ================================================
-- MIGRATION 002: Auth0 Integration
-- ================================================

-- Create users table for Auth0 users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,  -- Auth0 sub (e.g., 'google-oauth2|123' or 'auth0|abc')
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Change user_id column type from UUID to TEXT
ALTER TABLE workouts 
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Add foreign key constraint to reference our users table
ALTER TABLE workouts
  ADD CONSTRAINT workouts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (service role bypasses RLS anyway, but for clarity)
CREATE POLICY "Service role has full access to users"
  ON users FOR ALL
  USING (true)
  WITH CHECK (true);

-- Permissive policies for workouts (service role will handle all queries)
CREATE POLICY "Service role has full access to workouts"
  ON workouts FOR ALL
  USING (true)
  WITH CHECK (true);

-- Permissive policies for workout_exercises
CREATE POLICY "Service role has full access to workout_exercises"
  ON workout_exercises FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index on users email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ================================================
-- MIGRATION 003: Exercise Usage Tracking
-- ================================================

-- Table to track exercise usage per user for personalized sorting
CREATE TABLE user_exercise_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  usage_count INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, exercise_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_user_exercise_usage_user_id ON user_exercise_usage(user_id);
CREATE INDEX idx_user_exercise_usage_exercise_id ON user_exercise_usage(exercise_id);
CREATE INDEX idx_user_exercise_usage_count ON user_exercise_usage(user_id, usage_count DESC);

-- Enable Row Level Security
ALTER TABLE user_exercise_usage ENABLE ROW LEVEL SECURITY;

-- Permissive policy for service role access (Auth0 handles authorization at app level)
CREATE POLICY "Service role has full access to user_exercise_usage"
  ON user_exercise_usage FOR ALL
  USING (true)
  WITH CHECK (true);

-- ================================================
-- MIGRATION 004: Update Workout Focus
-- ================================================

-- Update existing workout focus values from old format to new format
UPDATE workouts
SET focus = 'Chest / Shoulders / Triceps'
WHERE focus = 'Chest/Triceps/Shoulders';

-- ================================================
-- MIGRATION 005: Add Rest Interval
-- ================================================

-- Add rest_interval column to workout_exercises
ALTER TABLE workout_exercises
  ADD COLUMN rest_interval INTEGER DEFAULT 60;

-- Add comment for documentation
COMMENT ON COLUMN workout_exercises.rest_interval IS 'Rest time between sets in seconds (default: 60)';

-- ================================================
-- SEED DATA: Muscle Groups and Exercises
-- ================================================

-- Seed muscle groups
INSERT INTO muscle_groups (name) VALUES
  ('Chest'),
  ('Triceps'),
  ('Shoulders'),
  ('Back'),
  ('Biceps'),
  ('Legs'),
  ('Core'),
  ('Cardio')
ON CONFLICT (name) DO NOTHING;

-- Seed exercises by muscle group
-- Chest exercises
INSERT INTO exercises (name, muscle_group_id)
SELECT 'Bench Press', id FROM muscle_groups WHERE name = 'Chest'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Incline Bench Press', id FROM muscle_groups WHERE name = 'Chest'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Dumbbell Press', id FROM muscle_groups WHERE name = 'Chest'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Dumbbell Flyes', id FROM muscle_groups WHERE name = 'Chest'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Machine Flies', id FROM muscle_groups WHERE name = 'Chest'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Dumbbell Incline Bench Press', id FROM muscle_groups WHERE name = 'Chest'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Push-ups', id FROM muscle_groups WHERE name = 'Chest'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Cable Crossover', id FROM muscle_groups WHERE name = 'Chest'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

-- Triceps exercises
INSERT INTO exercises (name, muscle_group_id)
SELECT 'Tricep Dips', id FROM muscle_groups WHERE name = 'Triceps'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Overhead Tricep Extension', id FROM muscle_groups WHERE name = 'Triceps'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Tricep Pushdown', id FROM muscle_groups WHERE name = 'Triceps'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Close Grip Bench Press', id FROM muscle_groups WHERE name = 'Triceps'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Skull Crushers', id FROM muscle_groups WHERE name = 'Triceps'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Rope Pull Downs', id FROM muscle_groups WHERE name = 'Triceps'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

-- Shoulders exercises
INSERT INTO exercises (name, muscle_group_id)
SELECT 'Overhead Press', id FROM muscle_groups WHERE name = 'Shoulders'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Lateral Raises', id FROM muscle_groups WHERE name = 'Shoulders'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Front Raises', id FROM muscle_groups WHERE name = 'Shoulders'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Front + Lateral Raises', id FROM muscle_groups WHERE name = 'Shoulders'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Rear Delt Flyes', id FROM muscle_groups WHERE name = 'Shoulders'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Dumbbell Shoulder Press', id FROM muscle_groups WHERE name = 'Shoulders'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Upright Row', id FROM muscle_groups WHERE name = 'Shoulders'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

-- Back exercises
INSERT INTO exercises (name, muscle_group_id)
SELECT 'Deadlift', id FROM muscle_groups WHERE name = 'Back'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Pull-ups', id FROM muscle_groups WHERE name = 'Back'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Barbell Row', id FROM muscle_groups WHERE name = 'Back'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Lat Pulldown', id FROM muscle_groups WHERE name = 'Back'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'T-Bar Row', id FROM muscle_groups WHERE name = 'Back'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Cable Row', id FROM muscle_groups WHERE name = 'Back'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Seated Row', id FROM muscle_groups WHERE name = 'Back'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Rows', id FROM muscle_groups WHERE name = 'Back'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Underhand Lat Pull Down', id FROM muscle_groups WHERE name = 'Back'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Close Grip Pull Down', id FROM muscle_groups WHERE name = 'Back'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

-- Biceps exercises
INSERT INTO exercises (name, muscle_group_id)
SELECT 'Barbell Curl', id FROM muscle_groups WHERE name = 'Biceps'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Dumbbell Curl', id FROM muscle_groups WHERE name = 'Biceps'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Hammer Curl', id FROM muscle_groups WHERE name = 'Biceps'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Cable Curl', id FROM muscle_groups WHERE name = 'Biceps'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Preacher Curl', id FROM muscle_groups WHERE name = 'Biceps'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Concentration Curl', id FROM muscle_groups WHERE name = 'Biceps'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Rope Curls', id FROM muscle_groups WHERE name = 'Biceps'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT '21 Curls', id FROM muscle_groups WHERE name = 'Biceps'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Hammer 21 Curls', id FROM muscle_groups WHERE name = 'Biceps'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

-- Legs exercises
INSERT INTO exercises (name, muscle_group_id)
SELECT 'Squats', id FROM muscle_groups WHERE name = 'Legs'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Leg Press', id FROM muscle_groups WHERE name = 'Legs'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Romanian Deadlift', id FROM muscle_groups WHERE name = 'Legs'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Leg Curls', id FROM muscle_groups WHERE name = 'Legs'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Hamstring Curls', id FROM muscle_groups WHERE name = 'Legs'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Single Leg Hamstring Curls', id FROM muscle_groups WHERE name = 'Legs'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Leg Extensions', id FROM muscle_groups WHERE name = 'Legs'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Lunges', id FROM muscle_groups WHERE name = 'Legs'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Calf Raises', id FROM muscle_groups WHERE name = 'Legs'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Bulgarian Split Squats', id FROM muscle_groups WHERE name = 'Legs'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

-- Core exercises
INSERT INTO exercises (name, muscle_group_id)
SELECT 'Core', id FROM muscle_groups WHERE name = 'Core'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

-- Cardio exercises
INSERT INTO exercises (name, muscle_group_id)
SELECT 'Running', id FROM muscle_groups WHERE name = 'Cardio'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Cycling', id FROM muscle_groups WHERE name = 'Cardio'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Rowing', id FROM muscle_groups WHERE name = 'Cardio'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Swimming', id FROM muscle_groups WHERE name = 'Cardio'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Peloton', id FROM muscle_groups WHERE name = 'Cardio'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

-- ================================================
-- SETUP COMPLETE!
-- ================================================
-- Your database is now ready to use with Curswoll
-- ================================================



