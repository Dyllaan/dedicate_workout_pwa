BEGIN;

DELETE FROM trusted_devices
WHERE user_id IN (
    SELECT id
    FROM users
    WHERE username = 'demo_seed_user'
       OR id = '11111111-1111-4111-8111-111111111111'
);

DELETE FROM backup_code
WHERE user_id IN (
    SELECT id
    FROM users
    WHERE username = 'demo_seed_user'
       OR id = '11111111-1111-4111-8111-111111111111'
);

DELETE FROM users
WHERE id = '11111111-1111-4111-8111-111111111111'
  AND username <> 'demo_seed_user';

INSERT INTO users (
    id,
    username,
    password,
    created_at,
    mfa_enabled,
    mfa_secret
)
VALUES (
    '11111111-1111-4111-8111-111111111111',
    'demo_seed_user',
    '$2a$10$pe.ogJrPNUuo7XS0NS/LceV5X2FCun38eo5BF1iEpYVbaQQD/plle',
    NOW(),
    FALSE,
    NULL
)
ON CONFLICT (username) DO UPDATE
SET id = EXCLUDED.id,
    password = EXCLUDED.password,
    created_at = EXCLUDED.created_at,
    mfa_enabled = FALSE,
    mfa_secret = NULL;

COMMIT;
