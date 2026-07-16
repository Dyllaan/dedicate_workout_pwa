CREATE TABLE IF NOT EXISTS readiness_check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    sleep_quality SMALLINT NOT NULL CHECK (sleep_quality BETWEEN 1 AND 5),
    stress_level SMALLINT NOT NULL CHECK (stress_level BETWEEN 1 AND 5),
    soreness_level SMALLINT NOT NULL CHECK (soreness_level BETWEEN 1 AND 5),
    confidence_level SMALLINT NOT NULL CHECK (confidence_level BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_readiness_check_ins_user_created_at
    ON readiness_check_ins(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS autotune_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    workout_template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
    exercise_name VARCHAR(255) NOT NULL,
    variant VARCHAR(255),
    action VARCHAR(32) NOT NULL CHECK (action IN ('APPLY', 'MODIFY', 'SKIP')),
    top_set_index INTEGER,
    base_recommended_weight_kg DOUBLE PRECISION,
    adjusted_recommended_weight_kg DOUBLE PRECISION,
    applied_weight_kg DOUBLE PRECISION,
    readiness_score SMALLINT,
    session_started_at TIMESTAMP WITH TIME ZONE,
    session_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_autotune_outcomes_user_created_at
    ON autotune_outcomes(user_id, created_at DESC);

