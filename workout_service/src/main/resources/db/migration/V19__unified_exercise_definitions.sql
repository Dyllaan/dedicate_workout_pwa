CREATE TABLE IF NOT EXISTS exercise_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    exercise_name VARCHAR(255) NOT NULL,
    variant VARCHAR(255),
    normalized_exercise_name VARCHAR(255) NOT NULL,
    normalized_variant VARCHAR(255) NOT NULL,
    exercise_info_id BIGINT REFERENCES exercise_info(id) ON DELETE SET NULL,
    mapping_source VARCHAR(32) NOT NULL,
    primary_muscle VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_exercise_definitions_user_identity
    ON exercise_definitions(user_id, normalized_exercise_name, normalized_variant);

CREATE INDEX IF NOT EXISTS idx_exercise_definitions_user_id
    ON exercise_definitions(user_id);

CREATE TABLE IF NOT EXISTS exercise_definition_secondary_muscles (
    exercise_definition_id UUID NOT NULL REFERENCES exercise_definitions(id) ON DELETE CASCADE,
    muscle VARCHAR(64) NOT NULL,
    PRIMARY KEY (exercise_definition_id, muscle)
);

ALTER TABLE workout_exercises
    ADD COLUMN IF NOT EXISTS exercise_config_id UUID DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS exercise_definition_id UUID REFERENCES exercise_definitions(id) ON DELETE SET NULL;

ALTER TABLE exercise_entries
    ADD COLUMN IF NOT EXISTS exercise_definition_id UUID REFERENCES exercise_definitions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS logged_exercise_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS logged_variant VARCHAR(255);

UPDATE workout_exercises
SET exercise_config_id = gen_random_uuid()
WHERE exercise_config_id IS NULL;

INSERT INTO exercise_definitions (
    user_id,
    exercise_name,
    variant,
    normalized_exercise_name,
    normalized_variant,
    exercise_info_id,
    mapping_source
)
SELECT DISTINCT
    wt.user_id,
    COALESCE(NULLIF(TRIM(ei.name), ''), TRIM(we.exercise_name)) AS exercise_name,
    NULLIF(COALESCE(TRIM(ei.variation), TRIM(we.variant), ''), '') AS variant,
    LOWER(COALESCE(NULLIF(TRIM(ei.name), ''), TRIM(we.exercise_name))) AS normalized_exercise_name,
    LOWER(COALESCE(NULLIF(TRIM(ei.variation), ''), TRIM(we.variant), '')) AS normalized_variant,
    COALESCE(ei.id, we.exercise_info_id) AS exercise_info_id,
    CASE WHEN COALESCE(ei.id, we.exercise_info_id) IS NULL THEN 'AUTO' ELSE 'CATALOG' END AS mapping_source
FROM workout_exercises we
JOIN workout_templates wt ON wt.id = we.workout_template_id
LEFT JOIN exercise_info ei ON ei.id = we.exercise_info_id
WHERE TRIM(we.exercise_name) <> ''
ON CONFLICT (user_id, normalized_exercise_name, normalized_variant) DO NOTHING;

INSERT INTO exercise_definitions (
    user_id,
    exercise_name,
    variant,
    normalized_exercise_name,
    normalized_variant,
    exercise_info_id,
    mapping_source
)
SELECT DISTINCT
    we.user_id,
    COALESCE(
        NULLIF(TRIM(ei.name), ''),
        NULLIF(TRIM(ee.exercise_name), ''),
        NULLIF(TRIM(template_we.exercise_name), ''),
        'Unknown exercise'
    ) AS exercise_name,
    NULLIF(
        COALESCE(TRIM(ei.variation), TRIM(ee.variant), TRIM(template_we.variant), ''),
        ''
    ) AS variant,
    LOWER(COALESCE(
        NULLIF(TRIM(ei.name), ''),
        NULLIF(TRIM(ee.exercise_name), ''),
        NULLIF(TRIM(template_we.exercise_name), ''),
        'Unknown exercise'
    )) AS normalized_exercise_name,
    LOWER(COALESCE(
        NULLIF(TRIM(ei.variation), ''),
        NULLIF(TRIM(ee.variant), ''),
        NULLIF(TRIM(template_we.variant), ''),
        ''
    )) AS normalized_variant,
    COALESCE(ei.id, ee.exercise_info_id, template_we.exercise_info_id) AS exercise_info_id,
    CASE WHEN COALESCE(ei.id, ee.exercise_info_id, template_we.exercise_info_id) IS NULL THEN 'AUTO' ELSE 'CATALOG' END AS mapping_source
FROM exercise_entries ee
JOIN workout_entries we ON we.id = ee.workout_entry_id
JOIN workout_templates wt ON wt.id = we.workout_template_id
LEFT JOIN workout_exercises template_we
    ON template_we.workout_template_id = wt.id
   AND template_we.exercise_order = ee.exercise_order
LEFT JOIN exercise_info ei ON ei.id = ee.exercise_info_id
ON CONFLICT (user_id, normalized_exercise_name, normalized_variant) DO NOTHING;

INSERT INTO exercise_definitions (
    user_id,
    exercise_name,
    variant,
    normalized_exercise_name,
    normalized_variant,
    exercise_info_id,
    mapping_source,
    primary_muscle
)
SELECT DISTINCT
    me.user_id,
    TRIM(me.exercise_name) AS exercise_name,
    NULLIF(TRIM(COALESCE(me.variant, '')), '') AS variant,
    me.normalized_exercise_name,
    me.normalized_variant,
    me.exercise_info_id,
    me.mapping_source::text AS mapping_source,
    me.primary_muscle::text AS primary_muscle
FROM mapped_exercises me
WHERE TRIM(me.exercise_name) <> ''
ON CONFLICT (user_id, normalized_exercise_name, normalized_variant) DO UPDATE
SET exercise_info_id = COALESCE(exercise_definitions.exercise_info_id, EXCLUDED.exercise_info_id),
    mapping_source = EXCLUDED.mapping_source,
    primary_muscle = COALESCE(EXCLUDED.primary_muscle, exercise_definitions.primary_muscle),
    updated_at = now();

INSERT INTO exercise_definition_secondary_muscles (exercise_definition_id, muscle)
SELECT DISTINCT
    ed.id,
    sem.muscle::text
FROM mapped_exercise_secondary_muscles sem
JOIN mapped_exercises me ON me.id = sem.mapped_exercise_id
JOIN exercise_definitions ed
    ON ed.user_id = me.user_id
   AND ed.normalized_exercise_name = me.normalized_exercise_name
   AND ed.normalized_variant = me.normalized_variant
ON CONFLICT (exercise_definition_id, muscle) DO NOTHING;

UPDATE workout_exercises target_we
SET exercise_definition_id = src.definition_id
FROM (
    SELECT
        we.exercise_config_id AS workout_exercise_config_id,
        ed.id AS definition_id
    FROM workout_exercises we
    JOIN workout_templates wt ON wt.id = we.workout_template_id
    LEFT JOIN exercise_info ei ON ei.id = we.exercise_info_id
    JOIN exercise_definitions ed
        ON ed.user_id = wt.user_id
       AND ed.normalized_exercise_name = LOWER(COALESCE(NULLIF(TRIM(ei.name), ''), TRIM(we.exercise_name)))
       AND ed.normalized_variant = LOWER(COALESCE(NULLIF(TRIM(ei.variation), ''), TRIM(we.variant), ''))
    WHERE we.exercise_definition_id IS NULL
) src
WHERE target_we.exercise_config_id = src.workout_exercise_config_id
  AND target_we.exercise_definition_id IS NULL;

UPDATE exercise_entries target_ee
SET exercise_definition_id = src.definition_id
FROM (
    SELECT
        ee.id AS exercise_entry_id,
        ed.id AS definition_id
FROM exercise_entries ee
JOIN workout_entries we ON we.id = ee.workout_entry_id
JOIN workout_templates wt ON wt.id = we.workout_template_id
LEFT JOIN workout_exercises template_we
    ON template_we.workout_template_id = wt.id
   AND template_we.exercise_order = ee.exercise_order
LEFT JOIN exercise_info ei ON ei.id = ee.exercise_info_id
JOIN exercise_definitions ed
        ON ed.user_id = we.user_id
       AND ed.normalized_exercise_name = LOWER(COALESCE(
           NULLIF(TRIM(ei.name), ''),
           NULLIF(TRIM(ee.exercise_name), ''),
           NULLIF(TRIM(template_we.exercise_name), ''),
           'Unknown exercise'
       ))
       AND ed.normalized_variant = LOWER(COALESCE(
           NULLIF(TRIM(ei.variation), ''),
           NULLIF(TRIM(ee.variant), ''),
           NULLIF(TRIM(template_we.variant), ''),
           ''
       ))
    WHERE ee.exercise_definition_id IS NULL
) src
WHERE target_ee.id = src.exercise_entry_id
  AND target_ee.exercise_definition_id IS NULL;

UPDATE exercise_entries
SET logged_exercise_name = COALESCE(logged_exercise_name, exercise_name),
    logged_variant = COALESCE(logged_variant, variant)
WHERE logged_exercise_name IS NULL;

ALTER TABLE workout_exercises
    ALTER COLUMN exercise_config_id SET NOT NULL;

ALTER TABLE workout_exercises
    ALTER COLUMN exercise_definition_id SET NOT NULL;

ALTER TABLE exercise_entries
    ALTER COLUMN exercise_definition_id SET NOT NULL;
