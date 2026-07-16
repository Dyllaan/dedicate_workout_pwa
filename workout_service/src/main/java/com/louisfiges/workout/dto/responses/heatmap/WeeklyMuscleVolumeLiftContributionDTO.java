package com.louisfiges.workout.dto.responses.heatmap;

public record WeeklyMuscleVolumeLiftContributionDTO(
        String exerciseName,
        String variant,
        double targetSets,
        double completedSets
) {
}
