-- Dumbbell Preacher Curls under Biceps (idempotent — safe if already present from seed)
-- Exposed in the "Back / Biceps" focus group, which includes the Biceps muscle group.
INSERT INTO exercises (name, muscle_group_id)
SELECT 'Dumbbell Preacher Curls', id FROM muscle_groups WHERE name = 'Biceps'
ON CONFLICT (name, muscle_group_id) DO NOTHING;
