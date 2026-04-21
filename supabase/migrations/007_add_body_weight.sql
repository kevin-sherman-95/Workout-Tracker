-- Add body_weight column to workouts table for tracking user body weight per workout
ALTER TABLE workouts ADD COLUMN body_weight DECIMAL(5,1);
