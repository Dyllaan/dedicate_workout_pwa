ALTER TABLE exercise_entries
    ALTER COLUMN exercise_order DROP NOT NULL;

ALTER TABLE set_entries
    ALTER COLUMN set_order DROP NOT NULL;
