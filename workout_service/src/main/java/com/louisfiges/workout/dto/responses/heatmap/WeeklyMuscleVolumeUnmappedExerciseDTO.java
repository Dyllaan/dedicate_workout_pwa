package com.louisfiges.workout.dto.responses.heatmap;

public record WeeklyMuscleVolumeUnmappedExerciseDTO(
        String exerciseName,
        String variant,
        boolean affectsTarget,
        boolean affectsCompleted
) {
}
