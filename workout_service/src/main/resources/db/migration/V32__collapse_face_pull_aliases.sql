DROP TABLE IF EXISTS v32_face_pull_candidates;
DROP TABLE IF EXISTS v32_face_pull_canonical;
DROP TABLE IF EXISTS v32_face_pull_info;

CREATE TEMPORARY TABLE v32_face_pull_info AS
SELECT ei.id AS exercise_info_id
FROM exercise_info ei
JOIN exercise_catalog_equipment eq
    ON eq.id = ei.equipment_id
WHERE LOWER(ei.name) = LOWER('Face Pull')
  AND COALESCE(LOWER(ei.variation), '') = LOWER('No')
  AND LOWER(eq.name) = LOWER('Cable')
LIMIT 1;

CREATE TEMPORARY TABLE v32_face_pull_candidates AS
SELECT
    ed.id,
    ed.user_id,
    ed.exercise_name,
    ed.variant,
    ed.exercise_info_id,
    ed.created_at,
    ed.updated_at,
    ed.mapping_source,
    COALESCE((
        SELECT COUNT(*)
        FROM exercise_entries ee
        WHERE ee.exercise_definition_id = ed.id
    ), 0) AS entry_count,
    ROW_NUMBER() OVER (
        PARTITION BY ed.user_id
        ORDER BY
            CASE
                WHEN LOWER(ed.exercise_name) = LOWER('Face Pull') AND COALESCE(LOWER(ed.variant), '') = '' THEN 0
                WHEN LOWER(ed.exercise_name) = LOWER('Face pulls') AND COALESCE(LOWER(ed.variant), '') = '' THEN 1
                WHEN LOWER(ed.exercise_name) = LOWER('Facepulls') AND COALESCE(LOWER(ed.variant), '') = '' THEN 2
                WHEN LOWER(ed.exercise_name) = LOWER('Face Pull') THEN 3
                WHEN LOWER(ed.exercise_name) = LOWER('Face pulls') THEN 4
                WHEN LOWER(ed.exercise_name) = LOWER('Facepulls') THEN 5
                ELSE 6
            END,
            CASE WHEN ed.mapping_source = 'CATALOG' THEN 0 ELSE 1 END,
            COALESCE((
                SELECT COUNT(*)
                FROM exercise_entries ee
                WHERE ee.exercise_definition_id = ed.id
            ), 0) DESC,
            ed.updated_at DESC,
            ed.created_at DESC,
            ed.id
    ) AS candidate_rank
FROM exercise_definitions ed
WHERE LOWER(ed.exercise_name) IN (LOWER('Face Pull'), LOWER('Face pulls'), LOWER('Facepulls'));

CREATE TEMPORARY TABLE v32_face_pull_canonical AS
SELECT
    user_id,
    id AS canonical_definition_id
FROM v32_face_pull_candidates
WHERE candidate_rank = 1;

UPDATE exercise_definitions ed
SET exercise_name = 'Face Pull',
    variant = NULL,
    normalized_exercise_name = 'face_pull',
    normalized_variant = '',
    exercise_info_id = COALESCE((SELECT exercise_info_id FROM v32_face_pull_info), ed.exercise_info_id),
    mapping_source = 'CATALOG',
    primary_muscle = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE ed.id IN (
    SELECT canonical_definition_id
    FROM v32_face_pull_canonical
);

UPDATE exercise_configs ec
SET exercise_definition_id = (
    SELECT canonical.canonical_definition_id
    FROM v32_face_pull_candidates candidate
    JOIN v32_face_pull_canonical canonical
        ON canonical.user_id = candidate.user_id
    WHERE candidate.id = ec.exercise_definition_id
)
WHERE ec.exercise_definition_id IN (
    SELECT id
    FROM v32_face_pull_candidates
    WHERE id NOT IN (
        SELECT canonical_definition_id
        FROM v32_face_pull_canonical
    )
);

UPDATE exercise_entries ee
SET exercise_definition_id = (
    SELECT canonical.canonical_definition_id
    FROM v32_face_pull_candidates candidate
    JOIN v32_face_pull_canonical canonical
        ON canonical.user_id = candidate.user_id
    WHERE candidate.id = ee.exercise_definition_id
)
WHERE ee.exercise_definition_id IN (
    SELECT id
    FROM v32_face_pull_candidates
    WHERE id NOT IN (
        SELECT canonical_definition_id
        FROM v32_face_pull_canonical
    )
);

DELETE FROM exercise_definitions
WHERE id IN (
    SELECT id
    FROM v32_face_pull_candidates
    WHERE id NOT IN (
        SELECT canonical_definition_id
        FROM v32_face_pull_canonical
    )
);
