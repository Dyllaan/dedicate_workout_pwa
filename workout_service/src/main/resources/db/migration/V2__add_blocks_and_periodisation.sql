CREATE TABLE IF NOT EXISTS blocks (
                                      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    split_id UUID NOT NULL REFERENCES splits(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    block_type VARCHAR(50) NOT NULL,
    progression_strategy VARCHAR(50) NOT NULL,
    duration_weeks INT NOT NULL,
    target_rpe_min DOUBLE PRECISION NOT NULL,
    target_rpe_max DOUBLE PRECISION NOT NULL,
    rep_range_min INT NOT NULL,
    rep_range_max INT NOT NULL,
    block_order INT NOT NULL,
    start_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS block_weeks (
                                           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    week_number INT NOT NULL,
    is_deload BOOLEAN NOT NULL DEFAULT FALSE,
    target_sets_per_exercise INT NOT NULL,
    rpe_override_min DOUBLE PRECISION,
    rpe_override_max DOUBLE PRECISION,
    UNIQUE (block_id, week_number)
    );

CREATE TABLE IF NOT EXISTS week_workouts (
                                             week_id UUID NOT NULL REFERENCES block_weeks(id) ON DELETE CASCADE,
    workout_template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
    workout_order INT NOT NULL,
    PRIMARY KEY (week_id, workout_template_id)
    );

ALTER TABLE workout_templates
    ADD COLUMN IF NOT EXISTS week_id UUID REFERENCES block_weeks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_blocks_split_id ON blocks(split_id);
CREATE INDEX IF NOT EXISTS idx_blocks_split_order ON blocks(split_id, block_order);
CREATE INDEX IF NOT EXISTS idx_block_weeks_block_id ON block_weeks(block_id);
CREATE INDEX IF NOT EXISTS idx_week_workouts_week_id ON week_workouts(week_id);
CREATE INDEX IF NOT EXISTS idx_week_workouts_template_id ON week_workouts(workout_template_id);
CREATE INDEX IF NOT EXISTS idx_workout_templates_week_id ON workout_templates(week_id);