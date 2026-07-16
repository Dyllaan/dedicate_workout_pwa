BEGIN;

DELETE FROM workout_entries
WHERE user_id = '11111111-1111-4111-8111-111111111111';

DELETE FROM workout_templates
WHERE user_id = '11111111-1111-4111-8111-111111111111';

INSERT INTO workout_templates (
    id,
    name,
    user_id,
    category,
    created_at
)
VALUES (
    '22222222-2222-4222-8222-222222222222',
    'Demo Push Progression',
    '11111111-1111-4111-8111-111111111111',
    'Push',
    NOW()
);

INSERT INTO workout_exercises (
    workout_template_id,
    exercise_order,
    exercise_name,
    goal_sets,
    variant,
    goal_reps
)
VALUES (
    '22222222-2222-4222-8222-222222222222',
    0,
    'Bench Press',
    3,
    'Barbell',
    8
);

WITH session_data AS (
    SELECT
        session_no,
        (80 + ((session_no - 1) * 2.5))::double precision AS center_weight,
        date_trunc('day', NOW()) - ((10 - session_no) * INTERVAL '7 days') + INTERVAL '9 hours' AS created_at,
        ROUND((7.0 + ((session_no - 1) * 1.5 / 9.0))::numeric, 1)::double precision AS base_rpe
    FROM generate_series(1, 10) AS session_no
)
INSERT INTO workout_entries (
    id,
    workout_template_id,
    user_id,
    notes,
    created_at
)
SELECT
    ('33333333-3333-4333-8333-' || LPAD(session_no::text, 12, '0'))::uuid,
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
    'Seed session ' || session_no,
    created_at
FROM session_data
ORDER BY session_no;

WITH session_data AS (
    SELECT
        session_no
    FROM generate_series(1, 10) AS session_no
)
INSERT INTO exercise_entries (
    id,
    workout_entry_id,
    exercise_order,
    exercise_name,
    variant,
    goal_sets
)
SELECT
    ('44444444-4444-4444-8444-' || LPAD(session_no::text, 12, '0'))::uuid,
    ('33333333-3333-4333-8333-' || LPAD(session_no::text, 12, '0'))::uuid,
    0,
    'Bench Press',
    'Barbell',
    3
FROM session_data
ORDER BY session_no;

WITH session_data AS (
    SELECT
        session_no,
        (80 + ((session_no - 1) * 2.5))::double precision AS center_weight,
        ROUND((7.0 + ((session_no - 1) * 1.5 / 9.0))::numeric, 1)::double precision AS base_rpe
    FROM generate_series(1, 10) AS session_no
),
set_offsets AS (
    SELECT *
    FROM (
        VALUES
            (0, -2.5::double precision, -0.1::double precision),
            (1,  0.0::double precision,  0.0::double precision),
            (2,  2.5::double precision,  0.1::double precision)
    ) AS offsets(set_order, weight_offset, rpe_offset)
)
INSERT INTO set_entries (
    id,
    exercise_entry_id,
    set_order,
    reps,
    weight,
    rpe,
    notes
)
SELECT
    ('55555555-5555-4555-8555-' || LPAD(((session_no * 10) + set_order)::text, 12, '0'))::uuid,
    ('44444444-4444-4444-8444-' || LPAD(session_no::text, 12, '0'))::uuid,
    set_order,
    8,
    center_weight + weight_offset,
    ROUND((base_rpe + rpe_offset)::numeric, 1)::double precision,
    'Seed session ' || session_no || ' set ' || (set_order + 1)
FROM session_data
CROSS JOIN set_offsets
ORDER BY session_no, set_order;

COMMIT;
