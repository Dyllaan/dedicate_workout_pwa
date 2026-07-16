-- V3__migrate_blocks_to_programmes.sql

ALTER TABLE workout_templates DROP COLUMN IF EXISTS week_id;

DROP TABLE IF EXISTS week_workouts;
DROP TABLE IF EXISTS block_weeks CASCADE;
DROP TABLE IF EXISTS blocks;

CREATE TABLE IF NOT EXISTS programmes (
                                          id         UUID                     NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    start_date TIMESTAMP WITH TIME ZONE,
                             active     BOOLEAN                  NOT NULL DEFAULT TRUE
                             );

CREATE TABLE IF NOT EXISTS split_programmes (
                                                split_id     UUID NOT NULL REFERENCES splits(id)      ON DELETE CASCADE,
    programme_id UUID NOT NULL REFERENCES programmes(id)  ON DELETE CASCADE,
    PRIMARY KEY (split_id, programme_id)
    );

CREATE TABLE IF NOT EXISTS blocks (
                                      id                   UUID             NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    programme_id         UUID             NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
    name                 VARCHAR(255)     NOT NULL,
    block_type           VARCHAR(50)      NOT NULL,
    progression_strategy VARCHAR(50)      NOT NULL,
    duration_weeks       INTEGER          NOT NULL,
    target_rpe_min       DOUBLE PRECISION NOT NULL,
    target_rpe_max       DOUBLE PRECISION NOT NULL,
    rep_range_min        INTEGER          NOT NULL,
    rep_range_max        INTEGER          NOT NULL,
    block_order          INTEGER          NOT NULL,
    start_date           TIMESTAMP WITH TIME ZONE
                                                                                 );

CREATE TABLE IF NOT EXISTS block_weeks (
                                           id                       UUID             NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id                 UUID             NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    week_number              INTEGER          NOT NULL,
    deload                   BOOLEAN          NOT NULL DEFAULT FALSE,
    target_sets_per_exercise INTEGER          NOT NULL,
    rpe_override_min         DOUBLE PRECISION,
    rpe_override_max         DOUBLE PRECISION
    );