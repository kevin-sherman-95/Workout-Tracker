-- Update existing workout focus values from old format to new format
-- Changes "Chest/Triceps/Shoulders" to "Chest / Shoulders / Triceps"

UPDATE workouts
SET focus = 'Chest / Shoulders / Triceps'
WHERE focus = 'Chest/Triceps/Shoulders';



