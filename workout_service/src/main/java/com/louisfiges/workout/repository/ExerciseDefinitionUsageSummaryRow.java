package com.louisfiges.workout.repository;

import java.time.Instant;
import java.util.UUID;

public record ExerciseDefinitionUsageSummaryRow(
        UUID definitionId,
        long sessionCount,
        Instant lastUsedAt
) {
}
