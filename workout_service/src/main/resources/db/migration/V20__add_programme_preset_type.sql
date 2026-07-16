ALTER TABLE programmes
    ADD COLUMN IF NOT EXISTS preset_type VARCHAR(50);

UPDATE programmes
SET preset_type = 'CUSTOM'
WHERE preset_type IS NULL;

ALTER TABLE programmes
    ALTER COLUMN preset_type SET DEFAULT 'CUSTOM';

ALTER TABLE programmes
    ALTER COLUMN preset_type SET NOT NULL;
