CREATE INDEX IF NOT EXISTS idx_workout_entries_user_created_at_desc
    ON workout_entries(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workout_entries_user_template_created_at_desc
    ON workout_entries(user_id, workout_template_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_splits_user_active
    ON splits(user_id, active);

CREATE INDEX IF NOT EXISTS idx_split_programmes_split_programme
    ON split_programmes(split_id, programme_id);

CREATE INDEX IF NOT EXISTS idx_split_programmes_programme_split
    ON split_programmes(programme_id, split_id);

CREATE INDEX IF NOT EXISTS idx_blocks_programme_order
    ON blocks(programme_id, block_order);

CREATE INDEX IF NOT EXISTS idx_block_weeks_block_week
    ON block_weeks(block_id, week_number);

CREATE INDEX IF NOT EXISTS idx_progress_chart_presets_user_pinned_updated_at
    ON progress_chart_presets(user_id, pinned, updated_at DESC);
