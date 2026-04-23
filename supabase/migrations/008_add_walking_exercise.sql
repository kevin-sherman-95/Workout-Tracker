-- Walking under Cardio (idempotent — safe if already present from seed)
INSERT INTO exercises (name, muscle_group_id)
SELECT 'Walking', id FROM muscle_groups WHERE name = 'Cardio'
ON CONFLICT (name, muscle_group_id) DO NOTHING;
