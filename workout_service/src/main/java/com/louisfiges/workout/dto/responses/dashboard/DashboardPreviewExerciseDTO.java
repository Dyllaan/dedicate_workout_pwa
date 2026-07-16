package com.louisfiges.workout.dto.responses.dashboard;

public record DashboardPreviewExerciseDTO(
        String exerciseName,
        String variant,
        int goalSets
) {
}
