ALTER TABLE readiness_check_ins
    ADD COLUMN IF NOT EXISTS workout_entry_id UUID REFERENCES workout_entries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_readiness_check_ins_workout_entry_id
    ON readiness_check_ins(workout_entry_id);
