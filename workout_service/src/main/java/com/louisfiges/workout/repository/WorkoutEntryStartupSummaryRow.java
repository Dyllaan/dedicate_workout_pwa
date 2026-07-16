package com.louisfiges.workout.repository;

import java.time.Instant;
import java.util.UUID;

public record WorkoutEntryStartupSummaryRow(
        UUID workoutId,
        long entryCount,
        Double totalWeightLifted,
        UUID latestEntryId,
        Instant latestCreatedAt
) {
}
