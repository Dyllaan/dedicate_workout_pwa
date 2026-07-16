package com.louisfiges.workout.dto.responses.dashboard;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record DashboardNextWorkoutDTO(
        UUID id,
        String name,
        String category,
        List<DashboardPreviewExerciseDTO> previewExercises,
        int extraExerciseCount,
        Instant lastCompletedAt,
        Integer lastSetCount
) {
}
