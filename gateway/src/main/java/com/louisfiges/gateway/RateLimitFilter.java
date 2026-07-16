package com.louisfiges.gateway;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitFilter implements WebFilter, Ordered {

    private static final Logger logger = LoggerFactory.getLogger(RateLimitFilter.class);

    private final JwtVerifier jwtVerifier;
    private final Map<String, Bucket> cache = new ConcurrentHashMap<>();

    // Global limit
    private static final int GLOBAL_CAPACITY = 10000;
    private static final int GLOBAL_TOKENS = 5000; // per minute

    // Per-IP limits
    private static final int IP_CAPACITY = 100;
    private static final int IP_TOKENS = 60;

    // Per-user limits (authenticated)
    private static final int USER_CAPACITY = 300;
    private static final int USER_TOKENS = 200;

    // Endpoint-specific limits (per IP)
    private static final int LOGIN_CAPACITY = 10;
    private static final int LOGIN_TOKENS = 5;  // 5 login attempts per minute

    private static final int REGISTER_CAPACITY = 5;
    private static final int REGISTER_TOKENS = 3;  // 3 registrations per minute

    private static final int BROWSER_LOG_CAPACITY = 10;
    private static final int BROWSER_LOG_TOKENS = 5;

    public RateLimitFilter() {
        this(new JwtVerifier());
    }

    RateLimitFilter(JwtVerifier jwtVerifier) {
        this.jwtVerifier = jwtVerifier;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequest().getMethod().name())) {
            return chain.filter(exchange);
        }

        String path = exchange.getRequest().getURI().getPath();
        String ip = getClientIp(exchange);
        String userId = extractUserId(exchange);

        // Global limit
        if (!checkLimit("global", GLOBAL_CAPACITY, GLOBAL_TOKENS)) {
            return rateLimitExceeded(exchange, "Global rate limit exceeded");
        }

        // Per-IP limit
        if (!checkLimit("ip:" + ip, IP_CAPACITY, IP_TOKENS)) {
            return rateLimitExceeded(exchange, "IP rate limit exceeded");
        }

        // specific limits (per IP)
        if (path.startsWith("/auth/login")) {
            if (!checkLimit("ip:" + ip + ":login", LOGIN_CAPACITY, LOGIN_TOKENS)) {
                return rateLimitExceeded(exchange, "Too many login attempts");
            }
        } else if (path.startsWith("/auth/register")) {
            if (!checkLimit("ip:" + ip + ":register", REGISTER_CAPACITY, REGISTER_TOKENS)) {
                return rateLimitExceeded(exchange, "Too many registration attempts");
            }
        } else if (path.startsWith("/browser-logs")) {
            if (!checkLimit("ip:" + ip + ":browser-logs", BROWSER_LOG_CAPACITY, BROWSER_LOG_TOKENS)) {
                return rateLimitExceeded(exchange, "Too many browser log submissions");
            }
        }

        // Per-user limit (if authenticated)
        if (userId != null) {
            if (!checkLimit("user:" + userId, USER_CAPACITY, USER_TOKENS)) {
                return rateLimitExceeded(exchange, "User rate limit exceeded");
            }
        }

        return chain.filter(exchange);
    }

    private boolean checkLimit(String key, int capacity, int tokens) {
        Bucket bucket = cache.computeIfAbsent(key, k -> createBucket(capacity, tokens));

        return bucket.tryConsume(1);
    }

    private Bucket createBucket(int capacity, int tokens) {
        Bandwidth limit = Bandwidth.builder()
                .capacity(capacity)
                .refillGreedy(tokens, Duration.ofMinutes(1))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    private String getClientIp(ServerWebExchange exchange) {
        // Check X-Forwarded-For header (if behind reverse proxy)
        String forwardedFor = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isEmpty()) {
            return forwardedFor.split(",")[0].trim();
        }

        // Fall back to remote address
        return exchange.getRequest().getRemoteAddress() != null
                ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
                : "unknown";
    }

    private String extractUserId(ServerWebExchange exchange) {
        String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }

        try {
            String token = authHeader.substring(7);
            Claims claims = jwtVerifier.parseAccessToken(token);
            return claims.getSubject();
        } catch (JwtException e) {
            logger.debug("Failed to extract user from JWT: {}", e.getMessage());
            return null;
        }
    }

    private Mono<Void> rateLimitExceeded(ServerWebExchange exchange, String message) {
        logger.atWarn()
                .addKeyValue("event_type", "rate_limit_exceeded")
                .addKeyValue("client_ip", getClientIp(exchange))
                .addKeyValue("path", exchange.getRequest().getURI().getPath())
                .addKeyValue("reason", message)
                .log("rate limit exceeded");

        exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
        exchange.getResponse().getHeaders().add("X-Rate-Limit-Retry-After-Seconds", "60");
        exchange.getResponse().getHeaders().add("X-Rate-Limit-Reason", message);

        return exchange.getResponse().setComplete();
    }

    @Override
    public int getOrder() {
        return -50;  // Run after CorsFilter (-100) but before AuthFilter (0)
    }
}
