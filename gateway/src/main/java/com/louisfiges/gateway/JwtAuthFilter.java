package com.louisfiges.gateway;

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

@Component
public class JwtAuthFilter implements WebFilter, Ordered {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthFilter.class);

    private final JwtVerifier jwtVerifier;

    public JwtAuthFilter() {
        this(new JwtVerifier());
    }

    JwtAuthFilter(JwtVerifier jwtVerifier) {
        this.jwtVerifier = jwtVerifier;
    }

    private void applyCorsHeaders(ServerWebExchange exchange) {
        String origin = exchange.getRequest().getHeaders().getOrigin();

        if (origin != null && !origin.isBlank()) {
            exchange.getResponse().getHeaders().set("Access-Control-Allow-Origin", origin);
            exchange.getResponse().getHeaders().set("Access-Control-Allow-Credentials", "true");
        }

        exchange.getResponse().getHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        exchange.getResponse().getHeaders().set("Access-Control-Allow-Headers", "Authorization, Content-Type");
        exchange.getResponse().getHeaders().set("Access-Control-Max-Age", "3600");
        exchange.getResponse().getHeaders().set("Vary", "Origin, Access-Control-Request-Method, Access-Control-Request-Headers");
    }

    @Override
    public int getOrder() {
        return 0;  // Run AFTER RateLimitFilter (-50) but before routes
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {

        if ("OPTIONS".equalsIgnoreCase(exchange.getRequest().getMethod().name())) {
            exchange.getResponse().setStatusCode(HttpStatus.OK);
            applyCorsHeaders(exchange);
            return exchange.getResponse().setComplete();
        }

        String path = exchange.getRequest().getURI().getPath();

        if (!requiresGatewayAuth(path)) {
            return chain.filter(exchange);
        }

        String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
            applyCorsHeaders(exchange);
            return exchange.getResponse().setComplete();
        }

        String token = authHeader.substring(7);

        try {
            jwtVerifier.parseAccessToken(token);
            return chain.filter(exchange);
        } catch (JwtException e) {
            logger.error("JWT validation failed: {}", e.getMessage());
            exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
            applyCorsHeaders(exchange);
            return exchange.getResponse().setComplete();
        }
    }

    private boolean requiresGatewayAuth(String path) {
        if (path.equals("/fallback") || path.equals("/workout-fallback")) {
            return false;
        }

        if (path.equals("/actuator/health") || path.equals("/version") || path.equals("/service-status")) {
            if (path.equals("/version")) {
                logger.info("Allowing /version through without auth");
            }
            return false;
        }

        if (path.equals("/browser-logs")) {
            return false;
        }

        if (path.equals("/auth") || path.startsWith("/auth/")) {
            return false;
        }

        if (path.equals("/workout/actuator/health") || path.equals("/workout/version")) {
            return false;
        }

        return path.equals("/workout") || path.startsWith("/workout/");
    }
}
