package com.louisfiges.workout.dto.request.progress;

import java.util.UUID;

public record ProgressChartQueryRequestDTO(
        UUID exerciseDefinitionId,
        String metric,
        String comparisonMode
) {
}
