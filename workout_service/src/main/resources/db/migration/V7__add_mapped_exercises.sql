CREATE TABLE IF NOT EXISTS mapped_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    exercise_name VARCHAR(255) NOT NULL,
    variant VARCHAR(255),
    normalized_exercise_name VARCHAR(255) NOT NULL,
    normalized_variant VARCHAR(255) NOT NULL,
    mapping_source VARCHAR(32) NOT NULL,
    exercise_info_id BIGINT REFERENCES exercise_info(id) ON DELETE SET NULL,
    primary_muscle VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mapped_exercises_user_identity
    ON mapped_exercises(user_id, normalized_exercise_name, normalized_variant);

CREATE INDEX IF NOT EXISTS idx_mapped_exercises_user_id
    ON mapped_exercises(user_id);

CREATE TABLE IF NOT EXISTS mapped_exercise_secondary_muscles (
    mapped_exercise_id UUID NOT NULL REFERENCES mapped_exercises(id) ON DELETE CASCADE,
    muscle VARCHAR(64) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mapped_exercise_secondary_unique
    ON mapped_exercise_secondary_muscles(mapped_exercise_id, muscle);
