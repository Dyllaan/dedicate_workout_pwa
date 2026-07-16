ALTER TABLE exercise_entries
    ALTER COLUMN workout_entry_id DROP NOT NULL;

ALTER TABLE set_entries
    ALTER COLUMN exercise_entry_id DROP NOT NULL;
