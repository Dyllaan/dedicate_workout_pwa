ALTER TABLE workout_exercises
    ADD COLUMN IF NOT EXISTS exercise_info_id BIGINT REFERENCES exercise_info(id);

ALTER TABLE exercise_entries
    ADD COLUMN IF NOT EXISTS exercise_info_id BIGINT REFERENCES exercise_info(id);
