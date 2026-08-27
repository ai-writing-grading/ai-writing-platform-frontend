\set ON_ERROR_STOP on

ALTER ROLE :"db_user" WITH PASSWORD :'db_password';

INSERT INTO users (user_id, email, hashed_password, is_active)
VALUES (
    'e2e-user-00000000-0000-0000-0000-000000000001',
    'student.e2e@local.aiwriting.dev',
    '$2b$12$NqHH94MMMwPUY00VZpiFH.Gqcgf.5Xo1mPe4YRB6wvCkp88gmpvlS',
    TRUE
)
ON CONFLICT (user_id) DO UPDATE
SET email = EXCLUDED.email,
    hashed_password = EXCLUDED.hashed_password,
    is_active = TRUE;

INSERT INTO subscriptions (user_id, plan, status)
SELECT user_id, 'pro', 'active'
FROM users
WHERE email = 'student.e2e@local.aiwriting.dev'
ON CONFLICT (user_id) DO UPDATE
SET plan = 'pro',
    status = 'active';

DELETE FROM pipeline_results
WHERE user_id = (
    SELECT user_id FROM users WHERE email = 'student.e2e@local.aiwriting.dev'
);
