DROP TABLE IF EXISTS v28_repair_targets;

CREATE TEMPORARY TABLE v28_repair_targets (
    repair_key VARCHAR(64) NOT NULL,
    exercise_definition_id UUID NOT NULL
);

INSERT INTO v28_repair_targets (repair_key, exercise_definition_id)
SELECT 'FACE_PULLS', ed.id
FROM exercise_definitions ed
WHERE ed.exercise_info_id IS NULL
  AND ed.user_id = 'a33e8658-4694-4990-b329-a19bec29e059'
  AND LOWER(ed.exercise_name) = LOWER('Face pulls');

INSERT INTO v28_repair_targets (repair_key, exercise_definition_id)
SELECT 'LEG_CURL', ed.id
FROM exercise_definitions ed
WHERE ed.exercise_info_id IS NULL
  AND ed.user_id = 'a33e8658-4694-4990-b329-a19bec29e059'
  AND LOWER(ed.exercise_name) = LOWER('Leg Curl');

INSERT INTO v28_repair_targets (repair_key, exercise_definition_id)
SELECT 'LEG_ADDUCTION', ed.id
FROM exercise_definitions ed
WHERE ed.exercise_info_id IS NULL
  AND ed.user_id = 'a33e8658-4694-4990-b329-a19bec29e059'
  AND LOWER(ed.exercise_name) = LOWER('Leg Adduction');

INSERT INTO v28_repair_targets (repair_key, exercise_definition_id)
SELECT 'LEG_PRESS', ed.id
FROM exercise_definitions ed
WHERE ed.exercise_info_id IS NULL
  AND ed.user_id = 'a33e8658-4694-4990-b329-a19bec29e059'
  AND LOWER(ed.exercise_name) = LOWER('Leg Press');

INSERT INTO v28_repair_targets (repair_key, exercise_definition_id)
SELECT 'CALF_RAISE', ed.id
FROM exercise_definitions ed
WHERE ed.exercise_info_id IS NULL
  AND ed.user_id = 'a33e8658-4694-4990-b329-a19bec29e059'
  AND LOWER(ed.exercise_name) = LOWER('Calf Raise');

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Face Pull')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
          AND LOWER(eq.name) = LOWER('Cable')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Face pulls')
  AND EXISTS (
      SELECT 1
      FROM v28_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'FACE_PULLS'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Seated Leg Curl')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
          AND LOWER(eq.name) = LOWER('Lever (selectorized)')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Leg Curl')
  AND EXISTS (
      SELECT 1
      FROM v28_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'LEG_CURL'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Seated Hip Adduction')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
          AND LOWER(eq.name) = LOWER('Lever (selectorized)')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Leg Adduction')
  AND EXISTS (
      SELECT 1
      FROM v28_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'LEG_ADDUCTION'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) LIKE LOWER('Leg Presses:%45° Leg Press')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('Yes')
          AND LOWER(eq.name) = LOWER('Sled')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Leg Press')
  AND EXISTS (
      SELECT 1
      FROM v28_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'LEG_PRESS'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Standing Calf Raise')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
          AND LOWER(eq.name) = LOWER('Lever (selectorized)')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Calf Raise')
  AND EXISTS (
      SELECT 1
      FROM v28_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'CALF_RAISE'
  );

DELETE FROM exercise_definition_secondary_muscles
WHERE exercise_definition_id IN (
    SELECT exercise_definition_id
    FROM v28_repair_targets
);
