CREATE TABLE IF NOT EXISTS progress_chart_presets (
    id                UUID                     NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID                     NOT NULL,
    name              VARCHAR(255)             NOT NULL,
    metric            VARCHAR(50)              NOT NULL,
    comparison_mode   VARCHAR(50)              NOT NULL,
    aggregation       VARCHAR(50)              NOT NULL,
    smoothing         VARCHAR(50)              NOT NULL,
    baseline_mode     VARCHAR(50)              NOT NULL,
    date_range_preset VARCHAR(50)              NOT NULL,
    from_at           TIMESTAMP WITH TIME ZONE,
    to_at             TIMESTAMP WITH TIME ZONE,
    pinned            BOOLEAN                  NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS progress_chart_preset_series (
    preset_id      UUID         NOT NULL REFERENCES progress_chart_presets(id) ON DELETE CASCADE,
    series_order   INTEGER      NOT NULL,
    exercise_name  VARCHAR(255) NOT NULL,
    variant        VARCHAR(255),
    label          VARCHAR(255),
    color          VARCHAR(50),
    PRIMARY KEY (preset_id, series_order)
);
