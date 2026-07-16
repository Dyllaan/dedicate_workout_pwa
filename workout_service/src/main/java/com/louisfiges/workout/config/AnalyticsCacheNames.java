package com.louisfiges.workout.config;

import java.util.List;

public final class AnalyticsCacheNames {

    public static final String TOP_SET_AUTOTUNE_RECOMMENDATIONS = "topSetAutotuneRecommendations";
    public static final String ANALYSIS_RECOMMENDATION_RESPONSES = "analysisRecommendationResponses";

    private static final List<String> ANALYSIS_CACHES = List.of(
            ANALYSIS_RECOMMENDATION_RESPONSES
    );

    private static final List<String> ALL_CACHES = List.of(
            TOP_SET_AUTOTUNE_RECOMMENDATIONS,
            ANALYSIS_RECOMMENDATION_RESPONSES
    );

    private AnalyticsCacheNames() {
    }

    public static List<String> analysisCaches() {
        return ANALYSIS_CACHES;
    }

    public static List<String> allCaches() {
        return ALL_CACHES;
    }
}
