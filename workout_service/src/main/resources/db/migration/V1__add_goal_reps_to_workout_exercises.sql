ALTER TABLE workout_exercises
    ADD COLUMN IF NOT EXISTS goal_reps INTEGER NULL;