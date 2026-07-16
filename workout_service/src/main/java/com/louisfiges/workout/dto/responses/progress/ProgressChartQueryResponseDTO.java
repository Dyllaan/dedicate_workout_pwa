package com.louisfiges.workout.dto.responses.progress;

import java.util.List;

public record ProgressChartQueryResponseDTO(
        String unit,
        String metric,
        String comparisonMode,
        List<ProgressChartPointDTO> points
) {
}
