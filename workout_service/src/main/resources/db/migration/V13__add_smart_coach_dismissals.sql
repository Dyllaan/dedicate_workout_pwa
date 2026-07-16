CREATE TABLE IF NOT EXISTS smart_coach_dismissals (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    exercise_name VARCHAR(255) NOT NULL,
    variant VARCHAR(255),
    normalized_exercise_name VARCHAR(255) NOT NULL,
    normalized_variant VARCHAR(255) NOT NULL,
    signal_fingerprint VARCHAR(255) NOT NULL,
    status VARCHAR(64) NOT NULL,
    recommended_action VARCHAR(64),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_smart_coach_dismissals_user_signal
    ON smart_coach_dismissals(user_id, normalized_exercise_name, normalized_variant, signal_fingerprint);

CREATE INDEX IF NOT EXISTS idx_smart_coach_dismissals_user_updated_at
    ON smart_coach_dismissals(user_id, updated_at DESC);
