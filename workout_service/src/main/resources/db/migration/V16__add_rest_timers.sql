ALTER TABLE set_entries
    ADD COLUMN IF NOT EXISTS rest_before_seconds INTEGER;

ALTER TABLE workout_exercises
    ADD COLUMN IF NOT EXISTS target_rest_seconds INTEGER;

CREATE TABLE IF NOT EXISTS workout_user_settings (
    user_id UUID PRIMARY KEY,
    default_rest_seconds INTEGER NOT NULL DEFAULT 90
);
