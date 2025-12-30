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
SELECT 'Plank', id FROM muscle_groups WHERE name = 'Core'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Crunches', id FROM muscle_groups WHERE name = 'Core'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Russian Twists', id FROM muscle_groups WHERE name = 'Core'
ON CONFLICT (name, muscle_group_id) DO NOTHING;

INSERT INTO exercises (name, muscle_group_id)
SELECT 'Leg Raises', id FROM muscle_groups WHERE name = 'Core'
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

