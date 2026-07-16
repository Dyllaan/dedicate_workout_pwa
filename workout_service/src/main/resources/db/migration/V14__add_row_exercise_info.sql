-- Add common cable row variants with catalog-derived muscle mappings.
-- Mappings follow row biomechanics and ExRx row conventions:
-- Cable Seated Row and Cable Rear Delt Row emphasize lats/back with traps,
-- posterior delts, elbow flexors, and forearms contributing.

INSERT INTO exercise_info (
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
) VALUES (
    'Low Row',
    'Cable',
    NULL,
    'Basic',
    'Compound',
    'Pull',
    'Sit facing the cable with a neutral spine and arms extended toward the low pulley.',
    'Pull the handle toward the lower torso, driving elbows back, then return under control.',
    'Latissimus Dorsi, Middle Trapezius, Lower Trapezius, Posterior Deltoid',
    'Biceps Brachii, Brachialis, Brachioradialis, Wrist Flexors',
    'Erector Spinae, Rhomboids',
    NULL,
    NULL,
    'Back',
    2,
    NULL,
    NULL
)
ON CONFLICT (name, (COALESCE(variation, '')), (COALESCE(equipment, '')))
DO UPDATE SET
    utility = EXCLUDED.utility,
    mechanics = EXCLUDED.mechanics,
    force = EXCLUDED.force,
    preparation = EXCLUDED.preparation,
    execution = EXCLUDED.execution,
    target_muscles = EXCLUDED.target_muscles,
    synergist_muscles = EXCLUDED.synergist_muscles,
    stabilizer_muscles = EXCLUDED.stabilizer_muscles,
    main_muscle = EXCLUDED.main_muscle,
    difficulty = EXCLUDED.difficulty,
    secondary_muscles = EXCLUDED.secondary_muscles;

INSERT INTO exercise_info (
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
) VALUES (
    'High Row',
    'Cable',
    NULL,
    'Basic',
    'Compound',
    'Pull',
    'Set the pulley around upper-chest height and hold the handles with arms reaching forward.',
    'Pull elbows back and slightly out toward the upper torso, then return under control.',
    'Latissimus Dorsi, Middle Trapezius, Lower Trapezius, Posterior Deltoid',
    'Biceps Brachii, Brachialis, Brachioradialis, Wrist Flexors',
    'Erector Spinae, Rhomboids',
    NULL,
    NULL,
    'Back',
    2,
    NULL,
    NULL
)
ON CONFLICT (name, (COALESCE(variation, '')), (COALESCE(equipment, '')))
DO UPDATE SET
    utility = EXCLUDED.utility,
    mechanics = EXCLUDED.mechanics,
    force = EXCLUDED.force,
    preparation = EXCLUDED.preparation,
    execution = EXCLUDED.execution,
    target_muscles = EXCLUDED.target_muscles,
    synergist_muscles = EXCLUDED.synergist_muscles,
    stabilizer_muscles = EXCLUDED.stabilizer_muscles,
    main_muscle = EXCLUDED.main_muscle,
    difficulty = EXCLUDED.difficulty,
    secondary_muscles = EXCLUDED.secondary_muscles;
