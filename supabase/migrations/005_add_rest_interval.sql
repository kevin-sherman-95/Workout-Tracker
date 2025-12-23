-- Add rest_interval column to workout_exercises
-- This tracks the rest time between sets in seconds
ALTER TABLE workout_exercises
  ADD COLUMN rest_interval INTEGER DEFAULT 60;

-- Add comment for documentation
COMMENT ON COLUMN workout_exercises.rest_interval IS 'Rest time between sets in seconds (default: 60)';



