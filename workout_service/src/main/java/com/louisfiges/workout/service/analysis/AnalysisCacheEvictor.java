package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.config.AnalyticsCacheNames;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class AnalysisCacheEvictor {

    private final CacheManager cacheManager;

    public AnalysisCacheEvictor(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }

    public void evictAnalysisCachesAfterCommit() {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            evictAnalysisCaches();
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                evictAnalysisCaches();
            }
        });
    }

    public void evictAnalysisCaches() {
        for (String cacheName : AnalyticsCacheNames.analysisCaches()) {
            Cache cache = cacheManager.getCache(cacheName);
            if (cache != null) {
                cache.clear();
            }
        }
    }
}
