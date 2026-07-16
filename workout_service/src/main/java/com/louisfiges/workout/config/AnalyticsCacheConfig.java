package com.louisfiges.workout.config;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.cache.support.NoOpCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.connection.RedisConnectionFactory;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

import java.time.Duration;

@Configuration
@EnableCaching
public class AnalyticsCacheConfig {

    @Bean
    public CacheManager analyticsCacheManager(
            @Value("${app.analytics.cache.enabled:false}") boolean enabled,
            @Value("${app.analytics.cache.redis.enabled:false}") boolean redisEnabled,
            @Value("${app.analytics.cache.response-ttl:PT2M}") Duration responseTtl,
            ObjectProvider<RedisConnectionFactory> redisConnectionFactoryProvider
    ) {
        if (!enabled) {
            return new NoOpCacheManager();
        }

        if (redisEnabled) {
            RedisConnectionFactory redisConnectionFactory = redisConnectionFactoryProvider.getIfAvailable();
            if (redisConnectionFactory != null) {
                RedisCacheConfiguration configuration = RedisCacheConfiguration.defaultCacheConfig()
                        .serializeValuesWith(
                                RedisSerializationContext.SerializationPair.fromSerializer(
                                        redisSerializer()
                                )
                        )
                        .entryTtl(responseTtl);
                return RedisCacheManager.builder(redisConnectionFactory)
                        .withInitialCacheConfigurations(AnalyticsCacheNames.allCaches().stream()
                                .collect(java.util.stream.Collectors.toMap(
                                        cacheName -> cacheName,
                                        cacheName -> configuration
                                )))
                        .cacheDefaults(configuration)
                        .build();
            }
        }

        ConcurrentMapCacheManager cacheManager = new ConcurrentMapCacheManager();
        cacheManager.setCacheNames(AnalyticsCacheNames.allCaches());
        return cacheManager;
    }

    GenericJackson2JsonRedisSerializer redisSerializer() {
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        return GenericJackson2JsonRedisSerializer.builder()
                .objectMapper(objectMapper)
                .defaultTyping(true)
                .build();
    }
}
