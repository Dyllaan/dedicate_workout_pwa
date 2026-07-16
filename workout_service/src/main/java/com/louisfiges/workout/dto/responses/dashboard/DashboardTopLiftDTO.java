package com.louisfiges.workout.dto.responses.dashboard;

import java.time.LocalDate;
import java.time.Instant;
import java.util.UUID;

public record DashboardTopLiftDTO(
        UUID exerciseDefinitionId,
        String exerciseName,
        String variant,
        int sessionCount,
        double personalBestKg,
        double improvementKg,
        Instant personalBestTopSetPerformedAt,
        Instant improvementBaselineTopSetPerformedAt,
        Double topSetWeightKg,
        Integer topSetReps,
        Double estimatedOneRepMaxKg,
        Double bodyweightKg,
        LocalDate bodyweightLoggedAt,
        Double loadBodyweightRatio,
        Double estimatedOneRepMaxBodyweightRatio,
        Double mostRecentTopSetWeightKg,
        Integer mostRecentTopSetReps,
        Double mostRecentEstimatedOneRepMaxKg,
        Instant mostRecentTopSetPerformedAt,
        Double mostRecentBodyweightKg,
        LocalDate mostRecentBodyweightLoggedAt,
        Double mostRecentLoadBodyweightRatio,
        Double mostRecentEstimatedOneRepMaxBodyweightRatio,
        Double previousTopSetWeightKg,
        Integer previousTopSetReps,
        Double previousEstimatedOneRepMaxKg,
        Instant previousTopSetPerformedAt
) {
}
