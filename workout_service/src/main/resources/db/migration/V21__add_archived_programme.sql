ALTER TABLE programmes
    ADD COLUMN IF NOT EXISTS archived BOOLEAN;

UPDATE programmes
SET archived = FALSE
WHERE archived IS NULL;

ALTER TABLE programmes
    ALTER COLUMN archived SET DEFAULT FALSE;

ALTER TABLE programmes
    ALTER COLUMN archived SET NOT NULL;
