package com.louisfiges.workout.dto.responses.progress;

import java.time.Instant;

public record ProgressChartPointDTO(
        Instant timestamp,
        String seriesKey,
        Double value
) {
}
