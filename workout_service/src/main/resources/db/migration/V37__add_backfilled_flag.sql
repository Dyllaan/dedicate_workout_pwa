ALTER TABLE workout_inol ADD COLUMN IF NOT EXISTS backfilled BOOLEAN NOT NULL DEFAULT FALSE;

DELETE FROM workout_inol a
USING workout_inol b
WHERE a.workout_entry_id = b.workout_entry_id
  AND a.exercise_name = b.exercise_name
  AND a.created_at < b.created_at;

ALTER TABLE workout_inol ADD CONSTRAINT uq_workout_inol_entry_exercise
  UNIQUE (workout_entry_id, exercise_name);
