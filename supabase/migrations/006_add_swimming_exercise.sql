-- Swimming under Cardio (idempotent — safe if already present from seed)
INSERT INTO exercises (name, muscle_group_id)
SELECT 'Swimming', id FROM muscle_groups WHERE name = 'Cardio'
ON CONFLICT (name, muscle_group_id) DO NOTHING;
