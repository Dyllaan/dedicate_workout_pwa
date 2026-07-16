UPDATE exercise_configs
SET progression_mode = 'WEIGHT_FIRST'
WHERE progression_mode IS NULL
   OR progression_mode NOT IN ('WEIGHT_FIRST', 'REPS_FIRST', 'VOLUME');
