DROP TABLE IF EXISTS v29_repair_targets;

CREATE TEMPORARY TABLE v29_repair_targets (
    repair_key VARCHAR(64) NOT NULL,
    exercise_definition_id UUID NOT NULL
);

INSERT INTO v29_repair_targets (repair_key, exercise_definition_id)
SELECT 'LOUIS_SHRUG_VARIANT', ed.id
FROM exercise_definitions ed
WHERE ed.user_id = '76a41d5f-5e98-41a8-8467-2cbf96d27efb'
  AND ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Barbell Shrug')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Calf raise machine');

INSERT INTO v29_repair_targets (repair_key, exercise_definition_id)
SELECT 'LOUIS_BICEP_CURLS_DUMBBELL', ed.id
FROM exercise_definitions ed
WHERE ed.user_id = '76a41d5f-5e98-41a8-8467-2cbf96d27efb'
  AND ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Bicep Curls')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Dumbbell');

INSERT INTO v29_repair_targets (repair_key, exercise_definition_id)
SELECT 'LOUIS_DIP_MACHINE_CLOSE_GRIP', ed.id
FROM exercise_definitions ed
WHERE ed.user_id = '76a41d5f-5e98-41a8-8467-2cbf96d27efb'
  AND ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Dip Machine')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Close Grip');

INSERT INTO v29_repair_targets (repair_key, exercise_definition_id)
SELECT 'LOUIS_DUMBBELL_CURL_DUMBBELL', ed.id
FROM exercise_definitions ed
WHERE ed.user_id = '76a41d5f-5e98-41a8-8467-2cbf96d27efb'
  AND ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Dumbbell Curl')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Dumbbell');

INSERT INTO v29_repair_targets (repair_key, exercise_definition_id)
SELECT 'LOUIS_HYPEREXTENSION_VARIANT', ed.id
FROM exercise_definitions ed
WHERE ed.user_id = '76a41d5f-5e98-41a8-8467-2cbf96d27efb'
  AND ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Hyperextension')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Calf raise machine');

INSERT INTO v29_repair_targets (repair_key, exercise_definition_id)
SELECT 'LOUIS_PEC_FLY_CLOSE_GRIP', ed.id
FROM exercise_definitions ed
WHERE ed.user_id = '76a41d5f-5e98-41a8-8467-2cbf96d27efb'
  AND ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Pec Fly')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Close Grip');

INSERT INTO v29_repair_targets (repair_key, exercise_definition_id)
SELECT 'LOUIS_PULL_OVER_VARIANT', ed.id
FROM exercise_definitions ed
WHERE ed.user_id = '76a41d5f-5e98-41a8-8467-2cbf96d27efb'
  AND ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Pullover')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Calf raise machine');

INSERT INTO v29_repair_targets (repair_key, exercise_definition_id)
SELECT 'LOUIS_PUSHDOWN_DUMBBELL', ed.id
FROM exercise_definitions ed
WHERE ed.user_id = '76a41d5f-5e98-41a8-8467-2cbf96d27efb'
  AND ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Pushdown')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Dumbbell');

INSERT INTO v29_repair_targets (repair_key, exercise_definition_id)
SELECT 'LOUIS_REAR_DELT_FLY', ed.id
FROM exercise_definitions ed
WHERE ed.user_id = '76a41d5f-5e98-41a8-8467-2cbf96d27efb'
  AND ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Rear Delt Fly')
  AND COALESCE(LOWER(ed.variant), '') = '';

INSERT INTO v29_repair_targets (repair_key, exercise_definition_id)
SELECT 'LOUIS_REAR_DELT_FLY_MACHINE', ed.id
FROM exercise_definitions ed
WHERE ed.user_id = '76a41d5f-5e98-41a8-8467-2cbf96d27efb'
  AND ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Rear Delt Fly')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Machine');

INSERT INTO v29_repair_targets (repair_key, exercise_definition_id)
SELECT 'LOUIS_REAR_DELT_FLY_SINGLE_ARM', ed.id
FROM exercise_definitions ed
WHERE ed.user_id = '76a41d5f-5e98-41a8-8467-2cbf96d27efb'
  AND ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Rear delt fly')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Single arm');

INSERT INTO v29_repair_targets (repair_key, exercise_definition_id)
SELECT 'LOUIS_REAR_DELT_FLY_CORRUPT', ed.id
FROM exercise_definitions ed
WHERE ed.user_id = '76a41d5f-5e98-41a8-8467-2cbf96d27efb'
  AND ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Rear delt fly')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Calf raise machine');

INSERT INTO v29_repair_targets (repair_key, exercise_definition_id)
SELECT 'LOUIS_SKULLCRUSHER_DUMBBELL', ed.id
FROM exercise_definitions ed
WHERE ed.user_id = '76a41d5f-5e98-41a8-8467-2cbf96d27efb'
  AND ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Skullcrusher')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Dumbbell');

INSERT INTO v29_repair_targets (repair_key, exercise_definition_id)
SELECT 'LOUIS_TRICEP_PUSHDOWN_DUMBBELL', ed.id
FROM exercise_definitions ed
WHERE ed.user_id = '76a41d5f-5e98-41a8-8467-2cbf96d27efb'
  AND ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Tricep Pushdown')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Dumbbell');

INSERT INTO v29_repair_targets (repair_key, exercise_definition_id)
SELECT 'LOUIS_UNDERHAND_PULLUPS_DUMBBELL', ed.id
FROM exercise_definitions ed
WHERE ed.user_id = '76a41d5f-5e98-41a8-8467-2cbf96d27efb'
  AND ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Underhand Pull-ups')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Dumbbell');

INSERT INTO v29_repair_targets (repair_key, exercise_definition_id)
SELECT 'LOUIS_VIKING_PRESS_DUMBBELL', ed.id
FROM exercise_definitions ed
WHERE ed.user_id = '76a41d5f-5e98-41a8-8467-2cbf96d27efb'
  AND ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Viking Press')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Dumbbell');

INSERT INTO v29_repair_targets (repair_key, exercise_definition_id)
SELECT 'ZANDER_FACEPULLS', ed.id
FROM exercise_definitions ed
WHERE ed.user_id = 'a33e8658-4694-4990-b329-a19bec29e059'
  AND ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Facepulls');

INSERT INTO v29_repair_targets (repair_key, exercise_definition_id)
SELECT 'ZANDER_LAT_RAISE', ed.id
FROM exercise_definitions ed
WHERE ed.user_id = 'a33e8658-4694-4990-b329-a19bec29e059'
  AND ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Lat raise')
  AND COALESCE(LOWER(ed.variant), '') = '';

INSERT INTO v29_repair_targets (repair_key, exercise_definition_id)
SELECT 'ZANDER_LAT_RAISE_LINE', ed.id
FROM exercise_definitions ed
WHERE ed.user_id = 'a33e8658-4694-4990-b329-a19bec29e059'
  AND ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Lat raise')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Line');

INSERT INTO v29_repair_targets (repair_key, exercise_definition_id)
SELECT 'ZANDER_LAT_RAISES', ed.id
FROM exercise_definitions ed
WHERE ed.user_id = 'a33e8658-4694-4990-b329-a19bec29e059'
  AND ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Lat raises');

INSERT INTO v29_repair_targets (repair_key, exercise_definition_id)
SELECT 'ZANDER_LOW_ROW_MACHINE', ed.id
FROM exercise_definitions ed
WHERE ed.user_id = 'a33e8658-4694-4990-b329-a19bec29e059'
  AND ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Low row')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Machine');

INSERT INTO v29_repair_targets (repair_key, exercise_definition_id)
SELECT 'ZANDER_OVERHEAD_TRICEPS', ed.id
FROM exercise_definitions ed
WHERE ed.user_id = 'a33e8658-4694-4990-b329-a19bec29e059'
  AND ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Overhead triceps');

INSERT INTO v29_repair_targets (repair_key, exercise_definition_id)
SELECT 'ZANDER_PULL_UP', ed.id
FROM exercise_definitions ed
WHERE ed.user_id = 'a33e8658-4694-4990-b329-a19bec29e059'
  AND ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Pull up');

INSERT INTO v29_repair_targets (repair_key, exercise_definition_id)
SELECT 'ZANDER_TRICEP_DIP', ed.id
FROM exercise_definitions ed
WHERE ed.user_id = 'a33e8658-4694-4990-b329-a19bec29e059'
  AND ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Tricep dip');

INSERT INTO exercise_catalog_muscle_group (name)
SELECT 'Rear Delt'
WHERE NOT EXISTS (
    SELECT 1
    FROM exercise_catalog_muscle_group
    WHERE LOWER(name) = LOWER('Rear Delt')
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
    'Rear Delt Fly',
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
      WHERE LOWER(existing.name) = LOWER('Rear Delt Fly')
        AND COALESCE(LOWER(existing.variation), '') = LOWER('No')
        AND existing.equipment_id = eq.id
  );

INSERT INTO exercise_info_muscles (exercise_info_id, muscle_role, muscle_group_id)
SELECT ei.id, 'TARGET', mg.id
FROM exercise_info ei
JOIN exercise_catalog_muscle_group mg
    ON LOWER(mg.name) = LOWER('Rear Delt')
WHERE LOWER(ei.name) = LOWER('Rear Delt Fly')
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
WHERE LOWER(ei.name) = LOWER('Rear Delt Fly')
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
WHERE LOWER(ei.name) = LOWER('Rear Delt Fly')
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
        WHERE LOWER(ei.name) = LOWER('Shrug')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
          AND LOWER(eq.name) = LOWER('Lever (plate loaded)')
        LIMIT 1
    ),
    mapping_source = 'MANUAL',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Barbell Shrug')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Calf raise machine')
  AND EXISTS (
      SELECT 1
      FROM v29_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'LOUIS_SHRUG_VARIANT'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Curl')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
          AND LOWER(eq.name) = LOWER('Dumbbell')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Bicep Curls')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Dumbbell')
  AND EXISTS (
      SELECT 1
      FROM v29_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'LOUIS_BICEP_CURLS_DUMBBELL'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Triceps Dip:  alternative machine')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('Yes')
          AND LOWER(eq.name) = LOWER('Lever (selectorized)')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Dip Machine')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Close Grip')
  AND EXISTS (
      SELECT 1
      FROM v29_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'LOUIS_DIP_MACHINE_CLOSE_GRIP'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Curl')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
          AND LOWER(eq.name) = LOWER('Dumbbell')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Dumbbell Curl')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Dumbbell')
  AND EXISTS (
      SELECT 1
      FROM v29_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'LOUIS_DUMBBELL_CURL_DUMBBELL'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Hyperextension')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
          AND LOWER(eq.name) = LOWER('Weighted')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Hyperextension')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Calf raise machine')
  AND EXISTS (
      SELECT 1
      FROM v29_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'LOUIS_HYPEREXTENSION_VARIANT'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Flies:  Pec Deck Fly')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('Yes')
          AND LOWER(eq.name) = LOWER('Lever (selectorized)')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Pec Fly')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Close Grip')
  AND EXISTS (
      SELECT 1
      FROM v29_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'LOUIS_PEC_FLY_CLOSE_GRIP'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Pullover')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
          AND LOWER(eq.name) = LOWER('Lever (selectorized)')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Pullover')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Calf raise machine')
  AND EXISTS (
      SELECT 1
      FROM v29_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'LOUIS_PULL_OVER_VARIANT'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Pushdown')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
          AND LOWER(eq.name) = LOWER('Cable')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Pushdown')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Dumbbell')
  AND EXISTS (
      SELECT 1
      FROM v29_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'LOUIS_PUSHDOWN_DUMBBELL'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Rear Delt Fly')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
          AND LOWER(eq.name) = LOWER('Cable')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Rear Delt Fly')
  AND COALESCE(LOWER(ed.variant), '') = ''
  AND EXISTS (
      SELECT 1
      FROM v29_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'LOUIS_REAR_DELT_FLY'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Rear Delt Fly')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
          AND LOWER(eq.name) = LOWER('Cable')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Rear Delt Fly')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Machine')
  AND EXISTS (
      SELECT 1
      FROM v29_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'LOUIS_REAR_DELT_FLY_MACHINE'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Rear Delt Fly')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
          AND LOWER(eq.name) = LOWER('Cable')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Rear delt fly')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Single arm')
  AND EXISTS (
      SELECT 1
      FROM v29_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'LOUIS_REAR_DELT_FLY_SINGLE_ARM'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Shrug')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
          AND LOWER(eq.name) = LOWER('Lever (plate loaded)')
        LIMIT 1
    ),
    mapping_source = 'MANUAL',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Rear delt fly')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Calf raise machine')
  AND EXISTS (
      SELECT 1
      FROM v29_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'LOUIS_REAR_DELT_FLY_CORRUPT'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Lying Triceps Extension:  Skull Crusher')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('Yes')
          AND LOWER(eq.name) = LOWER('Barbell')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Skullcrusher')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Dumbbell')
  AND EXISTS (
      SELECT 1
      FROM v29_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'LOUIS_SKULLCRUSHER_DUMBBELL'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Pushdown')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
          AND LOWER(eq.name) = LOWER('Cable')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Tricep Pushdown')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Dumbbell')
  AND EXISTS (
      SELECT 1
      FROM v29_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'LOUIS_TRICEP_PUSHDOWN_DUMBBELL'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Pull-up')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
          AND LOWER(eq.name) = LOWER('Body Weight')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Underhand Pull-ups')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Dumbbell')
  AND EXISTS (
      SELECT 1
      FROM v29_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'LOUIS_UNDERHAND_PULLUPS_DUMBBELL'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Military Press:  Seated')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('Yes')
          AND LOWER(eq.name) = LOWER('Barbell')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Viking Press')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Dumbbell')
  AND EXISTS (
      SELECT 1
      FROM v29_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'LOUIS_VIKING_PRESS_DUMBBELL'
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
  AND LOWER(ed.exercise_name) = LOWER('Facepulls')
  AND EXISTS (
      SELECT 1
      FROM v29_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'ZANDER_FACEPULLS'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Lateral Raise')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
          AND LOWER(eq.name) = LOWER('Cable')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Lat raise')
  AND COALESCE(LOWER(ed.variant), '') = ''
  AND EXISTS (
      SELECT 1
      FROM v29_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'ZANDER_LAT_RAISE'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Lateral Raise')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
          AND LOWER(eq.name) = LOWER('Cable')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Lat raise')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Line')
  AND EXISTS (
      SELECT 1
      FROM v29_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'ZANDER_LAT_RAISE_LINE'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Lateral Raise')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
          AND LOWER(eq.name) = LOWER('Cable')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Lat raises')
  AND EXISTS (
      SELECT 1
      FROM v29_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'ZANDER_LAT_RAISES'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Low Row')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('')
          AND LOWER(eq.name) = LOWER('Cable')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Low row')
  AND LOWER(COALESCE(ed.variant, '')) = LOWER('Machine')
  AND EXISTS (
      SELECT 1
      FROM v29_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'ZANDER_LOW_ROW_MACHINE'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Triceps Extension')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
          AND LOWER(eq.name) = LOWER('Cable')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Overhead triceps')
  AND EXISTS (
      SELECT 1
      FROM v29_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'ZANDER_OVERHEAD_TRICEPS'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Pull-up')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
          AND LOWER(eq.name) = LOWER('Body Weight')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Pull up')
  AND EXISTS (
      SELECT 1
      FROM v29_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'ZANDER_PULL_UP'
  );

UPDATE exercise_definitions ed
SET exercise_info_id = (
        SELECT ei.id
        FROM exercise_info ei
        JOIN exercise_catalog_equipment eq
            ON eq.id = ei.equipment_id
        WHERE LOWER(ei.name) = LOWER('Triceps Dip')
          AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
          AND LOWER(eq.name) = LOWER('Body Weight')
        LIMIT 1
    ),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = now()
WHERE ed.exercise_info_id IS NULL
  AND LOWER(ed.exercise_name) = LOWER('Tricep dip')
  AND EXISTS (
      SELECT 1
      FROM v29_repair_targets repair
      WHERE repair.exercise_definition_id = ed.id
        AND repair.repair_key = 'ZANDER_TRICEP_DIP'
  );

DELETE FROM exercise_definition_secondary_muscles
WHERE exercise_definition_id IN (
    SELECT exercise_definition_id
    FROM v29_repair_targets
);
