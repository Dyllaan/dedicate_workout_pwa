package com.louisfiges.workout.dto.responses.insights;

import com.louisfiges.workout.analysis.types.TrainingState;

public record BlockSummaryDTO(
        InsightBlockContextDTO blockContext,
        TrainingState overallState,
        String headline,
        String focus,
        int plateauCount,
        int attentionCount,
        int positiveCount,
        int underexposedCount
) {}
