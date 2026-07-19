CREATE TABLE workout_inol (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    workout_entry_id UUID NOT NULL,
    exercise_entry_id UUID,
    exercise_name VARCHAR(255) NOT NULL,
    inol_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    reference_1rm_kg DOUBLE PRECISION NOT NULL DEFAULT 0,
    block_id UUID,
    carry_forward BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    FOREIGN KEY (workout_entry_id) REFERENCES workout_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_entry_id) REFERENCES exercise_entries(id) ON DELETE SET NULL,
    FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE SET NULL
);

CREATE INDEX idx_workout_inol_user_id ON workout_inol(user_id);
CREATE INDEX idx_workout_inol_workout_entry_id ON workout_inol(workout_entry_id);
CREATE INDEX idx_workout_inol_user_created ON workout_inol(user_id, created_at);
