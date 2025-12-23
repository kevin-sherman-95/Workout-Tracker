-- Migration for Auth0 integration
-- Auth0 user IDs are strings like 'google-oauth2|123456' or 'auth0|abc123'

-- Create users table for Auth0 users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,  -- Auth0 sub (e.g., 'google-oauth2|123' or 'auth0|abc')
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop existing foreign key constraint on workouts
ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_user_id_fkey;

-- Change user_id column type from UUID to TEXT
ALTER TABLE workouts 
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Add new foreign key constraint to reference our users table
ALTER TABLE workouts
  ADD CONSTRAINT workouts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Drop old RLS policies that use auth.uid()
DROP POLICY IF EXISTS "Users can view their own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can insert their own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can update their own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can delete their own workouts" ON workouts;

DROP POLICY IF EXISTS "Users can view their own workout exercises" ON workout_exercises;
DROP POLICY IF EXISTS "Users can insert their own workout exercises" ON workout_exercises;
DROP POLICY IF EXISTS "Users can update their own workout exercises" ON workout_exercises;
DROP POLICY IF EXISTS "Users can delete their own workout exercises" ON workout_exercises;

-- Since we're using service role key with Auth0, we'll handle authorization at the application level
-- Create permissive policies for service role access (these won't affect service role key which bypasses RLS)

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


