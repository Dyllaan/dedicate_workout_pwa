DROP TABLE IF EXISTS v30_delete_targets;

CREATE TEMPORARY TABLE v30_delete_targets (
    exercise_definition_id UUID NOT NULL,
    exercise_entry_id UUID NOT NULL
);

INSERT INTO v30_delete_targets (exercise_definition_id, exercise_entry_id)
SELECT ed.id, ee.id
FROM exercise_definitions ed
JOIN exercise_entries ee
    ON ee.exercise_definition_id = ed.id
WHERE ed.id = '034e7e87-2135-49d0-8d90-534e5420a47e'
  AND ee.id = '3fed0898-8c85-41ab-a119-97e4f7e9c49a';

DELETE FROM set_entries
WHERE exercise_entry_id IN (
    SELECT exercise_entry_id
    FROM v30_delete_targets
);

DELETE FROM exercise_entries
WHERE id IN (
    SELECT exercise_entry_id
    FROM v30_delete_targets
);

DELETE FROM exercise_definitions
WHERE id IN (
    SELECT exercise_definition_id
    FROM v30_delete_targets
);
