CREATE TABLE bodyweight_logs (
    id         UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL,
    weight_kg  DECIMAL(5,2) NOT NULL,
    logged_at  DATE         NOT NULL,
    notes      VARCHAR(200),
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_bodyweight_logs PRIMARY KEY (id)
);

CREATE INDEX idx_bodyweight_logs_user_date ON bodyweight_logs (user_id, logged_at DESC);
