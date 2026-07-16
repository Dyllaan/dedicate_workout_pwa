package com.louisfiges.workout.dto.responses.heatmap;

public record ExerciseInfoCatalogItemDTO(
        Long id,
        String name,
        String variation,
        String equipment,
        String mainMuscle
) {
}
