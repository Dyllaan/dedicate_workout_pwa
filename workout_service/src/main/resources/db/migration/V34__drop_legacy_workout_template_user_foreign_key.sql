ALTER TABLE workout_templates
    DROP CONSTRAINT IF EXISTS workout_templates_user_id_fkey;

ALTER TABLE workout_templates
    DROP CONSTRAINT IF EXISTS fk_workout_templates_user;
