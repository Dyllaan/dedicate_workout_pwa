package com.louisfiges.workout.dto.responses.insights;

import com.louisfiges.workout.analysis.types.RecommendedAction;
import com.louisfiges.workout.analysis.types.TrainingState;

public record TopSetAutotuneRecommendationDTO(
        String exerciseName,
        String variant,
        Double baseRecommendedWeightKg,
        Double adjustedRecommendedWeightKg,
        short readinessScore,
        String readinessTier,
        double adjustmentPercent,
        String rationale,
        TrainingState trainingState,
        RecommendedAction recommendedAction,
        boolean topSetOnly
) {
}
