package com.louisfiges.workout.dto.responses;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record InolHistoryResponse(
        List<InolHistoryItem> items
) {
    public record InolHistoryItem(
            UUID workoutEntryId,
            Instant createdAt,
            UUID templateId,
            String templateName,
            double totalInol,
            List<PerExerciseInol> perExercise
    ) {}

    public record PerExerciseInol(
            String exerciseName,
            double inolScore
    ) {}
}
