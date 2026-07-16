-- V30_1__align_daos_with_entities.sql
-- Align the database schema with the refactored DAO entities.
--
-- Changes:
-- 1. Create exercise_configs table (replaces workout_exercises @ElementCollection)
-- 2. Create split_workout_assignments table (replaces split_workouts @ManyToMany)
-- 3. Add split_id column to programmes (replaces split_programmes @ManyToMany)
-- 4. Migrate data from old tables to new
-- 5. Drop orphan columns from exercise_entries and programmes
-- 6. Drop orphan tables whose entities have been deleted

-- ============================================================
-- 1. CREATE NEW TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS exercise_configs (
    exercise_config_id      UUID             NOT NULL PRIMARY KEY,
    exercise_definition_id  UUID             NOT NULL REFERENCES exercise_definitions(id) ON DELETE CASCADE,
    workout_template_id     UUID             NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
    exercise_order          INTEGER          NOT NULL,
    goal_sets               INTEGER          NOT NULL,
    goal_reps               INTEGER,
    progression_mode        VARCHAR(32)      NOT NULL DEFAULT 'WEIGHT_FIRST',
    primary_benchmark       VARCHAR(32)      NOT NULL DEFAULT 'WORKING_SETS',
    target_rest_seconds     INTEGER,
    focus                   BOOLEAN          DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS split_workout_assignments (
    id                  UUID             NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    split_id            UUID             NOT NULL REFERENCES splits(id) ON DELETE CASCADE,
    workout_template_id UUID             NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
    sessions_per_week   INTEGER          NOT NULL DEFAULT 1,
    workout_order       INTEGER          NOT NULL,
    CONSTRAINT uq_split_workout_assignments_split_template
        UNIQUE (split_id, workout_template_id),
    CONSTRAINT ck_split_workout_assignments_sessions_per_week
        CHECK (sessions_per_week BETWEEN 1 AND 7)
);

-- ============================================================
-- 2. ADD split_id TO programmes
-- ============================================================

ALTER TABLE programmes
    ADD COLUMN IF NOT EXISTS split_id UUID REFERENCES splits(id) ON DELETE CASCADE;

-- Migrate data from split_programmes to programmes.split_id
UPDATE programmes p
SET split_id = sp.split_id
FROM split_programmes sp
WHERE sp.programme_id = p.id
  AND p.split_id IS NULL;

-- ============================================================
-- 3. MIGRATE DATA: workout_exercises → exercise_configs
-- ============================================================

INSERT INTO exercise_configs (
    exercise_config_id,
    exercise_definition_id,
    workout_template_id,
    exercise_order,
    goal_sets,
    goal_reps,
    progression_mode,
    primary_benchmark,
    target_rest_seconds,
    focus
)
SELECT
    COALESCE(we.exercise_config_id, gen_random_uuid()) AS exercise_config_id,
    we.exercise_definition_id,
    we.workout_template_id,
    we.exercise_order,
    we.goal_sets,
    we.goal_reps,
    COALESCE(we.progression_mode, 'WEIGHT_FIRST') AS progression_mode,
    COALESCE(we.primary_benchmark, 'WORKING_SETS') AS primary_benchmark,
    we.target_rest_seconds,
    COALESCE(we.focus, FALSE) AS focus
FROM workout_exercises we
WHERE we.exercise_definition_id IS NOT NULL
ON CONFLICT (exercise_config_id) DO NOTHING;

ALTER TABLE exercise_configs
    ADD COLUMN IF NOT EXISTS progression_mode VARCHAR(32) DEFAULT 'WEIGHT_FIRST',
    ADD COLUMN IF NOT EXISTS primary_benchmark VARCHAR(32) DEFAULT 'WORKING_SETS';

UPDATE exercise_configs
SET progression_mode = COALESCE(progression_mode, 'WEIGHT_FIRST'),
    primary_benchmark = COALESCE(primary_benchmark, 'WORKING_SETS');

ALTER TABLE exercise_configs
    ALTER COLUMN progression_mode SET DEFAULT 'WEIGHT_FIRST',
    ALTER COLUMN primary_benchmark SET DEFAULT 'WORKING_SETS';

ALTER TABLE exercise_configs
    ALTER COLUMN progression_mode SET NOT NULL,
    ALTER COLUMN primary_benchmark SET NOT NULL;

-- ============================================================
-- 4. MIGRATE DATA: split_workouts → split_workout_assignments
-- ============================================================

INSERT INTO split_workout_assignments (
    split_id,
    workout_template_id,
    sessions_per_week,
    workout_order
)
SELECT
    sw.split_id,
    sw.workout_template_id,
    COALESCE(sw.sessions_per_week, 1) AS sessions_per_week,
    sw.workout_order
FROM split_workouts sw
ON CONFLICT (split_id, workout_template_id) DO NOTHING;

-- ============================================================
-- 5. DROP ORPHAN COLUMNS
-- ============================================================

-- exercise_entries: exercise_name, variant, exercise_info_id replaced by
-- exercise_definition_id FK + logged_exercise_name/logged_variant
ALTER TABLE exercise_entries
    DROP COLUMN IF EXISTS exercise_name,
    DROP COLUMN IF EXISTS variant,
    DROP COLUMN IF EXISTS exercise_info_id;

-- programmes: goal_type removed from entity, focus_exercise_config_id removed from entity
ALTER TABLE programmes
    DROP COLUMN IF EXISTS goal_type,
    DROP COLUMN IF EXISTS focus_exercise_config_id;

-- ============================================================
-- 6. DROP ORPHAN TABLES
--    Entities deleted: MappedExercise, ProgressChartPreset, SmartCoachDismissal,
--    AutotuneOutcome, WeekWorkoutFrequency
-- ============================================================

DROP TABLE IF EXISTS mapped_exercise_secondary_muscles CASCADE;
DROP TABLE IF EXISTS mapped_exercises CASCADE;
DROP TABLE IF EXISTS progress_chart_preset_series CASCADE;
DROP TABLE IF EXISTS progress_chart_presets CASCADE;
DROP TABLE IF EXISTS smart_coach_dismissals CASCADE;
DROP TABLE IF EXISTS autotune_outcomes CASCADE;
DROP TABLE IF EXISTS week_workout_frequencies CASCADE;
DROP TABLE IF EXISTS workout_exercises CASCADE;
DROP TABLE IF EXISTS split_workouts CASCADE;
DROP TABLE IF EXISTS split_programmes CASCADE;

-- ============================================================
-- 7. ADD CONSTRAINTS AND INDEXES
-- ============================================================

-- Make programmes.split_id NOT NULL after migration
ALTER TABLE programmes
    ALTER COLUMN split_id SET NOT NULL;

-- Indexes for exercise_configs
CREATE INDEX IF NOT EXISTS idx_exercise_configs_workout_template
    ON exercise_configs(workout_template_id);
CREATE INDEX IF NOT EXISTS idx_exercise_configs_exercise_definition
    ON exercise_configs(exercise_definition_id);

-- Index for split_workout_assignments
CREATE INDEX IF NOT EXISTS idx_split_workout_assignments_split
    ON split_workout_assignments(split_id);
CREATE INDEX IF NOT EXISTS idx_split_workout_assignments_template
    ON split_workout_assignments(workout_template_id);

-- Index for programmes.split_id
CREATE INDEX IF NOT EXISTS idx_programmes_split_id
    ON programmes(split_id);
