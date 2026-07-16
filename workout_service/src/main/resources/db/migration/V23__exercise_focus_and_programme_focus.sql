ALTER TABLE workout_exercises
    ADD COLUMN IF NOT EXISTS focus BOOLEAN DEFAULT FALSE;

UPDATE workout_exercises
SET focus = FALSE
WHERE focus IS NULL;

ALTER TABLE workout_exercises
    ADD CONSTRAINT uq_workout_exercises_exercise_config_id UNIQUE (exercise_config_id);

ALTER TABLE programmes
    ADD COLUMN IF NOT EXISTS focus_exercise_config_id UUID;

ALTER TABLE programmes
    ADD CONSTRAINT fk_programmes_focus_exercise_config_id
        FOREIGN KEY (focus_exercise_config_id)
        REFERENCES workout_exercises(exercise_config_id)
        ON DELETE SET NULL;
