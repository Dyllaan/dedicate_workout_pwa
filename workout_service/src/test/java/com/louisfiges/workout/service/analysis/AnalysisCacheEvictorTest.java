package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.config.AnalyticsCacheNames;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AnalysisCacheEvictor")
class AnalysisCacheEvictorTest {

    @Test
    @DisplayName("clears all analysis response caches")
    void clearsAnalysisCaches() {
        ConcurrentMapCacheManager cacheManager = new ConcurrentMapCacheManager();
        cacheManager.setCacheNames(AnalyticsCacheNames.analysisCaches());
        AnalysisCacheEvictor evictor = new AnalysisCacheEvictor(cacheManager);

        cacheManager.getCache(AnalyticsCacheNames.ANALYSIS_RECOMMENDATION_RESPONSES)
                .put("user-a|template-a", "recommendation");

        evictor.evictAnalysisCaches();

        assertThat(cacheManager.getCache(AnalyticsCacheNames.ANALYSIS_RECOMMENDATION_RESPONSES).get("user-a|template-a"))
                .isNull();
    }
}
