package com.louisfiges.workout.dto.responses.heatmap;

public record HeatmapCoverageDTO(
        int totalExercises,
        int mappedExercises,
        int skippedExercises
) {
}
