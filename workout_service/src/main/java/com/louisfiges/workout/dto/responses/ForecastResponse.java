package com.louisfiges.workout.dto.responses;

import java.util.List;
import java.util.UUID;

public record ForecastResponse(
        UUID weekId,
        UUID blockId,
        String blockName,
        int weekNumber,
        boolean deload,
        double intensityPct,
        List<ForecastInsight> insights
) {
    public record ForecastInsight(
            UUID exerciseDefinitionId,
            String exerciseName,
            Double estimatedOneRmKg,
            Double targetWeightKg,
            int targetReps,
            double targetRpe,
            ForecastSource source,
            BestSetInfo bestSet
    ) {}

    public record BestSetInfo(
            int reps,
            double weightKg,
            String setDate
    ) {}
}
