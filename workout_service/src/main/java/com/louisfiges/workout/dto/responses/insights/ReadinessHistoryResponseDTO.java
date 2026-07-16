package com.louisfiges.workout.dto.responses.insights;

import com.louisfiges.workout.dto.responses.PagedResponse;

public record ReadinessHistoryResponseDTO(
        int days,
        double averageReadinessScore,
        PagedResponse<ReadinessHistoryPointDTO> points
) {
}
