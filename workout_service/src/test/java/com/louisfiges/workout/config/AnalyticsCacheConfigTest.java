package com.louisfiges.workout.config;

import com.louisfiges.workout.dto.responses.analysis.TemplateAnalysisRecommendationResponse;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AnalyticsCacheConfigTest {

    @Test
    void serializerRoundTripsInstantFields() {
        AnalyticsCacheConfig config = new AnalyticsCacheConfig();
        GenericJackson2JsonRedisSerializer serializer = config.redisSerializer();

        TemplateAnalysisRecommendationResponse original = new TemplateAnalysisRecommendationResponse(
                new TemplateAnalysisRecommendationResponse.Suggestion("INCREASE", 122.5, "Push on."),
                new TemplateAnalysisRecommendationResponse.Plateau(false, "No plateau detected."),
                new TemplateAnalysisRecommendationResponse.Trend(0.12, 108.3, 0.91, 4, "UP"),
                new TemplateAnalysisRecommendationResponse.HistorySummary(List.of(
                        new TemplateAnalysisRecommendationResponse.HistoryPoint(
                                Instant.parse("2026-07-11T10:15:30Z"),
                                120.0,
                                5,
                                8.5,
                                "ACTUAL"
                        )
                ))
        );

        byte[] payload = serializer.serialize(original);
        assertThat(payload).isNotNull();

        TemplateAnalysisRecommendationResponse roundTripped =
                serializer.deserialize(payload, TemplateAnalysisRecommendationResponse.class);

        assertThat(roundTripped).isNotNull();
        assertThat(roundTripped.historySummary().points()).hasSize(1);
        assertThat(roundTripped.historySummary().points().get(0).observedAt()).isEqualTo(Instant.parse("2026-07-11T10:15:30Z"));
        assertThat(roundTripped.trend().direction()).isEqualTo("UP");
        assertThat(roundTripped.suggestion().type()).isEqualTo("INCREASE");
    }
}
