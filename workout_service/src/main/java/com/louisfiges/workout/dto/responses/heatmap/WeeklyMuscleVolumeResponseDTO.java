package com.louisfiges.workout.dto.responses.heatmap;

import java.util.List;

public record WeeklyMuscleVolumeResponseDTO(
        String weekStart,
        String weekEnd,
        HeatmapCoverageDTO coverage,
        List<WeeklyMuscleVolumeMuscleDTO> muscles,
        List<WeeklyMuscleVolumeUnmappedExerciseDTO> unmappedExercises
) {
}
