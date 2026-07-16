ALTER TABLE split_workouts
    ADD COLUMN IF NOT EXISTS sessions_per_week INTEGER NOT NULL DEFAULT 1;

ALTER TABLE split_workouts
    DROP CONSTRAINT IF EXISTS ck_split_workouts_sessions_per_week;

ALTER TABLE split_workouts
    ADD CONSTRAINT ck_split_workouts_sessions_per_week
        CHECK (sessions_per_week BETWEEN 1 AND 7);
