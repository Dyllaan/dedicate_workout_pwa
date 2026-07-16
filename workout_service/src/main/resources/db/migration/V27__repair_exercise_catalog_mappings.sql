DROP TABLE IF EXISTS v27_repair_targets;

CREATE TEMPORARY TABLE v27_repair_targets (
    repair_key VARCHAR(64) NOT NULL,
    exercise_definition_id UUID NOT NULL
);

INSERT INTO exercise_catalog_muscle_group (name)
SELECT 'Rear Delt'
WHERE NOT EXISTS (
    SELECT 1
    FROM exercise_catalog_muscle_group
    WHERE LOWER(name) = LOWER('Rear Delt')
);

INSERT INTO exercise_catalog_muscle_group (name)
SELECT 'Abs'
WHERE NOT EXISTS (
    SELECT 1
    FROM exercise_catalog_muscle_group
    WHERE LOWER(name) = LOWER('Abs')
);

INSERT INTO v27_repair_targets (repair_key, exercise_definition_id)
SELECT 'FACE_PULL', ed.id
FROM exercise_definitions ed
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Face Pull');

INSERT INTO v27_repair_targets (repair_key, exercise_definition_id)
SELECT 'SITUP', ed.id
FROM exercise_definitions ed
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Situp');

INSERT INTO v27_repair_targets (repair_key, exercise_definition_id)
SELECT 'OVERHEAD_PRESS', ed.id
FROM exercise_definitions ed
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Overhead Press');

INSERT INTO v27_repair_targets (repair_key, exercise_definition_id)
SELECT 'TRICEP_DIP_MACHINE', ed.id
FROM exercise_definitions ed
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Tricep Dip')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Machine');

INSERT INTO exercise_info (
    name,
    equipment_id,
    variation,
    utility_id,
    mechanics_id,
    force_id,
    difficulty_id,
    main_muscle_id
)
SELECT
    'Face Pull',
    eq.id,
    'No',
    ut.id,
    me.id,
    ff.id,
    3,
    mg.id
FROM exercise_catalog_equipment eq
JOIN exercise_catalog_utility ut
    ON LOWER(ut.name) = LOWER('Basic or Auxiliary')
JOIN exercise_catalog_mechanics me
    ON LOWER(me.name) = LOWER('Compound')
JOIN exercise_catalog_force ff
    ON LOWER(ff.name) = LOWER('Pull')
JOIN exercise_catalog_muscle_group mg
    ON LOWER(mg.name) = LOWER('Rear Delt')
WHERE LOWER(eq.name) = LOWER('Cable')
  AND NOT EXISTS (
      SELECT 1
      FROM exercise_info existing
      WHERE LOWER(existing.name) = LOWER('Face Pull')
        AND COALESCE(LOWER(existing.variation), '') = LOWER('No')
        AND existing.equipment_id = eq.id
  );

INSERT INTO exercise_info (
    name,
    equipment_id,
    variation,
    utility_id,
    mechanics_id,
    force_id,
    difficulty_id,
    main_muscle_id
)
SELECT
    'Situp',
    eq.id,
    'No',
    ut.id,
    me.id,
    ff.id,
    3,
    mg.id
FROM exercise_catalog_equipment eq
JOIN exercise_catalog_utility ut
    ON LOWER(ut.name) = LOWER('Basic or Auxiliary')
JOIN exercise_catalog_mechanics me
    ON LOWER(me.name) = LOWER('Isolated')
JOIN exercise_catalog_force ff
    ON LOWER(ff.name) = LOWER('Pull')
JOIN exercise_catalog_muscle_group mg
    ON LOWER(mg.name) = LOWER('Abs')
WHERE LOWER(eq.name) = LOWER('Body Weight')
  AND NOT EXISTS (
      SELECT 1
      FROM exercise_info existing
      WHERE LOWER(existing.name) = LOWER('Situp')
        AND COALESCE(LOWER(existing.variation), '') = LOWER('No')
        AND existing.equipment_id = eq.id
  );

INSERT INTO exercise_info_muscles (exercise_info_id, muscle_role, muscle_group_id)
SELECT ei.id, 'TARGET', mg.id
FROM exercise_info ei
JOIN exercise_catalog_muscle_group mg
    ON LOWER(mg.name) = LOWER('Rear Delt')
WHERE LOWER(ei.name) = LOWER('Face Pull')
  AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
  AND NOT EXISTS (
      SELECT 1
      FROM exercise_info_muscles existing
      WHERE existing.exercise_info_id = ei.id
        AND existing.muscle_role = 'TARGET'
        AND existing.muscle_group_id = mg.id
  );

INSERT INTO exercise_info_muscles (exercise_info_id, muscle_role, muscle_group_id)
SELECT ei.id, 'SECONDARY', mg.id
FROM exercise_info ei
JOIN exercise_catalog_muscle_group mg
    ON LOWER(mg.name) = LOWER('Trapezius')
WHERE LOWER(ei.name) = LOWER('Face Pull')
  AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
  AND NOT EXISTS (
      SELECT 1
      FROM exercise_info_muscles existing
      WHERE existing.exercise_info_id = ei.id
        AND existing.muscle_role = 'SECONDARY'
        AND existing.muscle_group_id = mg.id
  );

INSERT INTO exercise_info_muscles (exercise_info_id, muscle_role, muscle_group_id)
SELECT ei.id, 'SECONDARY', mg.id
FROM exercise_info ei
JOIN exercise_catalog_muscle_group mg
    ON LOWER(mg.name) = LOWER('Rhomboids')
WHERE LOWER(ei.name) = LOWER('Face Pull')
  AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
  AND NOT EXISTS (
      SELECT 1
      FROM exercise_info_muscles existing
      WHERE existing.exercise_info_id = ei.id
        AND existing.muscle_role = 'SECONDARY'
        AND existing.muscle_group_id = mg.id
  );

INSERT INTO exercise_info_muscles (exercise_info_id, muscle_role, muscle_group_id)
SELECT ei.id, 'TARGET', mg.id
FROM exercise_info ei
JOIN exercise_catalog_muscle_group mg
    ON LOWER(mg.name) = LOWER('Abs')
WHERE LOWER(ei.name) = LOWER('Situp')
  AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
  AND NOT EXISTS (
      SELECT 1
      FROM exercise_info_muscles existing
      WHERE existing.exercise_info_id = ei.id
        AND existing.muscle_role = 'TARGET'
        AND existing.muscle_group_id = mg.id
  );

INSERT INTO exercise_info_muscles (exercise_info_id, muscle_role, muscle_group_id)
SELECT ei.id, 'SECONDARY', mg.id
FROM exercise_info ei
JOIN exercise_catalog_muscle_group mg
    ON LOWER(mg.name) = LOWER('Obliques')
WHERE LOWER(ei.name) = LOWER('Situp')
  AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
  AND NOT EXISTS (
      SELECT 1
      FROM exercise_info_muscles existing
      WHERE existing.exercise_info_id = ei.id
        AND existing.muscle_role = 'SECONDARY'
        AND existing.muscle_group_id = mg.id
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) LIKE LOWER('Military Press%')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('Yes')
          AND LOWER(eq.name) = LOWER('Barbell')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Overhead Press')
  AND EXISTS (
      SELECT 1
      FROM v27_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'OVERHEAD_PRESS'
  )
  AND EXISTS (
      SELECT 1
      FROM exercise_info ei
      JOIN exercise_catalog_equipment eq
          ON eq.id = ei.equipment_id
      WHERE LOWER(ei.name) LIKE LOWER('Military Press%')
        AND COALESCE(LOWER(ei.variation), '') = LOWER('Yes')
        AND LOWER(eq.name) = LOWER('Barbell')
  );

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
  AND LOWER(ed.exercise_name) = LOWER('Face Pull')
  AND EXISTS (
      SELECT 1
      FROM v27_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'FACE_PULL'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Situp')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
          AND LOWER(eq.name) = LOWER('Body Weight')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Situp')
  AND EXISTS (
      SELECT 1
      FROM v27_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'SITUP'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) LIKE LOWER('Triceps Dip%')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('Yes')
          AND LOWER(eq.name) = LOWER('Lever (selectorized)')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Tricep Dip')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Machine')
  AND EXISTS (
      SELECT 1
      FROM v27_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'TRICEP_DIP_MACHINE'
  );

DELETE FROM exercise_definition_secondary_muscles
WHERE exercise_definition_id IN (
    SELECT exercise_definition_id
    FROM v27_repair_targets
);
