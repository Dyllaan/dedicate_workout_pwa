package com.louisfiges.workout.dto.request.insights;

import com.louisfiges.workout.analysis.types.RecommendedAction;

import java.time.Instant;
import java.util.UUID;

public record AutotuneOutcomeRequestDTO(
        UUID workoutTemplateId,
        String exerciseName,
        String variant,
        RecommendedAction action,
        Integer topSetIndex,
        Double baseRecommendedWeightKg,
        Double adjustedRecommendedWeightKg,
        Double appliedWeightKg,
        Short readinessScore,
        Instant sessionStartedAt,
        Instant sessionCompletedAt
) {
}
