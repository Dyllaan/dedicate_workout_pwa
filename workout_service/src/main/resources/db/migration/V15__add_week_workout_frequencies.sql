CREATE TABLE IF NOT EXISTS week_workout_frequencies (
    week_id UUID NOT NULL REFERENCES block_weeks(id) ON DELETE CASCADE,
    workout_template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
    sessions_per_week INTEGER NOT NULL,
    PRIMARY KEY (week_id, workout_template_id),
    CONSTRAINT ck_week_workout_frequencies_sessions
        CHECK (sessions_per_week BETWEEN 0 AND 7)
);

CREATE INDEX IF NOT EXISTS idx_week_workout_frequencies_template
    ON week_workout_frequencies(workout_template_id);
