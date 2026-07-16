--
-- Seed exercise_info from a locally mounted gym_exercise_dataset.csv.
-- The third-party CSV is not stored in this repo.
-- Run via ops/seed/docker-compose.yml or the optional seed profile in ops/local/docker-compose.yml.
--

CREATE TEMP TABLE ei_staging (
    row_num          BIGSERIAL,
    name             TEXT NOT NULL,
    equipment        TEXT,
    variation        TEXT,
    utility          TEXT,
    mechanics        TEXT,
    force            TEXT,
    preparation      TEXT,
    execution        TEXT,
    t_muscles        TEXT,
    syn_muscles      TEXT,
    stab_muscles     TEXT,
    ant_muscles      TEXT,
    dyn_stab_muscles TEXT,
    main_muscle      TEXT,
    difficulty       TEXT,
    sec_muscles      TEXT,
    parent_id        TEXT
);

-- \copy is client-side: reads the CSV mounted into the init container from ops/seed/data/.
-- Positional column list means the "Difficulty (1-5)" header text is ignored.
\copy ei_staging(name, equipment, variation, utility, mechanics, force, preparation, execution, t_muscles, syn_muscles, stab_muscles, ant_muscles, dyn_stab_muscles, main_muscle, difficulty, sec_muscles, parent_id) FROM '/data/gym_exercise_dataset.csv' WITH (FORMAT csv, HEADER true, NULL '');

CREATE TEMP TABLE ei_canonical AS
SELECT
    row_num AS source_row_num,
    name,
    NULLIF(TRIM(equipment), '') AS equipment,
    NULLIF(TRIM(variation), '') AS variation,
    NULLIF(TRIM(utility), '') AS utility,
    NULLIF(TRIM(mechanics), '') AS mechanics,
    NULLIF(TRIM(force), '') AS force,
    NULLIF(TRIM(preparation), '') AS preparation,
    NULLIF(TRIM(execution), '') AS execution,
    NULLIF(TRIM(t_muscles), '') AS target_muscles,
    LEFT(NULLIF(TRIM(syn_muscles), ''), 255) AS synergist_muscles,   -- max 262 in dataset
    LEFT(NULLIF(TRIM(stab_muscles), ''), 255) AS stabilizer_muscles,  -- max 364 in dataset
    NULLIF(TRIM(ant_muscles), '') AS antagonist_muscles,
    NULLIF(TRIM(dyn_stab_muscles), '') AS dynamic_stabilizer_muscles,
    NULLIF(TRIM(main_muscle), '') AS main_muscle,
    NULLIF(TRIM(difficulty), '')::INTEGER AS difficulty,
    NULLIF(TRIM(sec_muscles), '') AS secondary_muscles,
    NULLIF(TRIM(parent_id), '')::BIGINT AS parent_row_num,
    ROW_NUMBER() OVER (
        PARTITION BY
            LOWER(TRIM(name)),
            LOWER(COALESCE(NULLIF(TRIM(variation), ''), '')),
            LOWER(COALESCE(NULLIF(TRIM(equipment), ''), ''))
        ORDER BY row_num
    ) AS canonical_rank
FROM ei_staging;

CREATE TEMP TABLE ei_row_map AS
SELECT
    source_row_num,
    MIN(source_row_num) OVER (
        PARTITION BY
            LOWER(TRIM(name)),
            LOWER(COALESCE(NULLIF(TRIM(variation), ''), '')),
            LOWER(COALESCE(NULLIF(TRIM(equipment), ''), ''))
    ) AS canonical_row_num
FROM ei_staging;

INSERT INTO exercise_info (
    id,
    name,
    equipment,
    variation,
    utility,
    mechanics,
    force,
    preparation,
    execution,
    target_muscles,
    synergist_muscles,
    stabilizer_muscles,
    antagonist_muscles,
    dynamic_stabilizer_muscles,
    main_muscle,
    difficulty,
    secondary_muscles,
    parent_id
)
OVERRIDING SYSTEM VALUE
SELECT
    c.source_row_num,
    c.name,
    c.equipment,
    c.variation,
    c.utility,
    c.mechanics,
    c.force,
    c.preparation,
    c.execution,
    c.target_muscles,
    c.synergist_muscles,
    c.stabilizer_muscles,
    c.antagonist_muscles,
    c.dynamic_stabilizer_muscles,
    c.main_muscle,
    c.difficulty,
    c.secondary_muscles,
    parent_map.canonical_row_num
FROM ei_canonical c
LEFT JOIN ei_row_map parent_map
    ON parent_map.source_row_num = c.parent_row_num
WHERE c.canonical_rank = 1;

SELECT setval(
    pg_get_serial_sequence('exercise_info', 'id'),
    COALESCE((SELECT MAX(id) FROM exercise_info), 1)
);
