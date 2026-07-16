package com.louisfiges.workout.dto.responses.heatmap;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record MuscleHeatmapResponseDTO(
        String scope,
        UUID templateId,
        UUID entryId,
        Instant performedAt,
        int entryCount,
        Map<String, Double> intensities,
        HeatmapCoverageDTO coverage,
        List<ResolvedExerciseHeatmapDTO> resolvedExercises,
        List<UnmappedExerciseHeatmapDTO> unmappedExercises
) {
}
