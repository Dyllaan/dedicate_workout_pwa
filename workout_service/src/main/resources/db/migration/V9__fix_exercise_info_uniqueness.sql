-- V9: Fix exercise_info FK constraints and replace name-only unique index
--     with a composite (name, variation, equipment) index so all CSV variants load.

-- 1. Fix FK constraints on workout_exercises and exercise_entries.
--    V8 added these with no ON DELETE clause (defaults to RESTRICT), so any
--    future deletion from exercise_info would be blocked. Upgrade to SET NULL
--    to match the behaviour of mapped_exercises (added in V7).
ALTER TABLE workout_exercises
    DROP CONSTRAINT IF EXISTS workout_exercises_exercise_info_id_fkey;
ALTER TABLE workout_exercises
    ADD CONSTRAINT workout_exercises_exercise_info_id_fkey
        FOREIGN KEY (exercise_info_id) REFERENCES exercise_info(id) ON DELETE SET NULL;

ALTER TABLE exercise_entries
    DROP CONSTRAINT IF EXISTS exercise_entries_exercise_info_id_fkey;
ALTER TABLE exercise_entries
    ADD CONSTRAINT exercise_entries_exercise_info_id_fkey
        FOREIGN KEY (exercise_info_id) REFERENCES exercise_info(id) ON DELETE SET NULL;

-- 2. Remove the name-only unique index introduced in V0.
DROP INDEX IF EXISTS idx_exercise_info_name;

-- 3. Wipe the incorrectly-seeded data (only 340/617 rows loaded due to the old
--    UNIQUE(name) constraint). Use DELETE, not TRUNCATE, so ON DELETE SET NULL
--    fires and nullifies exercise_info_id in workout_exercises, exercise_entries,
--    and mapped_exercises. TRUNCATE CASCADE would truncate those child tables.
DELETE FROM exercise_info;

-- 4. Composite functional unique index: one row per (name, variation, equipment).
--    COALESCE maps NULL -> '' so that null-equipment rows also deduplicate
--    (two NULLs are treated as distinct in a standard unique index).
CREATE UNIQUE INDEX idx_exercise_info_name_variation_equipment
    ON exercise_info (name, COALESCE(variation, ''), COALESCE(equipment, ''));
