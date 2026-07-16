package com.louisfiges.workout.dto.responses.analysis;

import java.util.List;

public record TemplateAnalysisRecommendationResponse(
        Suggestion suggestion,
        Plateau plateau,
        Trend trend,
        HistorySummary historySummary
) {
    public record Suggestion(
            String type,
            double suggestedWeightKg,
            String reasoning
    ) {
    }

    public record Plateau(
            boolean detected,
            String reason
    ) {
    }

    public record Trend(
            double slope,
            double intercept,
            double rSquared,
            int comparableObservationCount,
            String direction
    ) {
    }

    public record HistorySummary(
            List<HistoryPoint> points
    ) {
    }

    public record HistoryPoint(
            java.time.Instant observedAt,
            double weight,
            int reps,
            Double rpe,
            String pointType
    ) {
    }
}
