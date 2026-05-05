-- Repoint historical workout logs from "Preacher Curl" to "Dumbbell Preacher Curls".
-- Both exercises live in the Biceps muscle group. "Preacher Curl" is intentionally
-- kept available in the dropdown; only the data references move.
-- Idempotent: a second run finds nothing referencing "Preacher Curl" and is a no-op.

BEGIN;

-- 1) Repoint every logged set from Preacher Curl -> Dumbbell Preacher Curls.
UPDATE workout_exercises
SET exercise_id = (
  SELECT e.id FROM exercises e
  JOIN muscle_groups mg ON mg.id = e.muscle_group_id
  WHERE e.name = 'Dumbbell Preacher Curls' AND mg.name = 'Biceps'
)
WHERE exercise_id = (
  SELECT e.id FROM exercises e
  JOIN muscle_groups mg ON mg.id = e.muscle_group_id
  WHERE e.name = 'Preacher Curl' AND mg.name = 'Biceps'
);

-- 2) Merge user_exercise_usage. The UNIQUE(user_id, exercise_id) constraint means a
--    naive UPDATE would fail for users who have rows for both exercises, so:
--    a) Sum counts into the existing Dumbbell Preacher Curls row.
UPDATE user_exercise_usage AS dst_row
SET usage_count  = dst_row.usage_count + src_row.usage_count,
    last_used_at = GREATEST(dst_row.last_used_at, src_row.last_used_at)
FROM user_exercise_usage AS src_row
WHERE src_row.exercise_id = (
        SELECT e.id FROM exercises e
        JOIN muscle_groups mg ON mg.id = e.muscle_group_id
        WHERE e.name = 'Preacher Curl' AND mg.name = 'Biceps'
      )
  AND dst_row.exercise_id = (
        SELECT e.id FROM exercises e
        JOIN muscle_groups mg ON mg.id = e.muscle_group_id
        WHERE e.name = 'Dumbbell Preacher Curls' AND mg.name = 'Biceps'
      )
  AND dst_row.user_id = src_row.user_id;

--    b) Repoint leftover rows (user had only Preacher Curl, never Dumbbell Preacher Curls).
UPDATE user_exercise_usage
SET exercise_id = (
  SELECT e.id FROM exercises e
  JOIN muscle_groups mg ON mg.id = e.muscle_group_id
  WHERE e.name = 'Dumbbell Preacher Curls' AND mg.name = 'Biceps'
)
WHERE exercise_id = (
  SELECT e.id FROM exercises e
  JOIN muscle_groups mg ON mg.id = e.muscle_group_id
  WHERE e.name = 'Preacher Curl' AND mg.name = 'Biceps'
)
  AND NOT EXISTS (
    SELECT 1 FROM user_exercise_usage existing
    WHERE existing.user_id = user_exercise_usage.user_id
      AND existing.exercise_id = (
        SELECT e.id FROM exercises e
        JOIN muscle_groups mg ON mg.id = e.muscle_group_id
        WHERE e.name = 'Dumbbell Preacher Curls' AND mg.name = 'Biceps'
      )
  );

--    c) Delete the now-merged source rows (those whose counts were folded into 2a).
DELETE FROM user_exercise_usage
WHERE exercise_id = (
  SELECT e.id FROM exercises e
  JOIN muscle_groups mg ON mg.id = e.muscle_group_id
  WHERE e.name = 'Preacher Curl' AND mg.name = 'Biceps'
);

COMMIT;
