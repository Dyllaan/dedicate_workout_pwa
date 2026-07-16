package com.louisfiges.gateway;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.lang.reflect.Field;
import java.security.KeyPair;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RateLimitFilterTest {

    private KeyPair keyPair;
    private RateLimitFilter filter;

    @BeforeEach
    void setUp() throws Exception {
        keyPair = JwtTestTokens.generateKeyPair();
        filter = new RateLimitFilter(new JwtVerifier(
                (java.security.interfaces.RSAPublicKey) keyPair.getPublic(),
                JwtTestTokens.ISSUER
        ));
    }

    @Test
    void validAccessTokenCreatesPerUserBucket() throws Exception {
        String token = JwtTestTokens.accessToken(keyPair.getPrivate());
        RecordingChain chain = new RecordingChain();

        filter.filter(exchangeFor(token), chain).block();

        assertTrue(chain.called.get());
        assertTrue(cacheKeys().contains("user:" + JwtTestTokens.USER_ID));
    }

    @Test
    void invalidTokenDoesNotCreatePerUserBucket() throws Exception {
        String token = JwtTestTokens.token(
                keyPair.getPrivate(),
                JwtTestTokens.ISSUER,
                List.of("voip-services"),
                "refresh",
                Instant.now().plusSeconds(300)
        );
        RecordingChain chain = new RecordingChain();

        filter.filter(exchangeFor(token), chain).block();

        assertTrue(chain.called.get());
        assertFalse(cacheKeys().contains("user:" + JwtTestTokens.USER_ID));
    }

    @Test
    void browserLogSubmissionsAreIndividuallyRateLimited() {
        for (int index = 0; index < 10; index++) {
            MockServerWebExchange allowedExchange = exchangeForPath("/browser-logs");
            filter.filter(allowedExchange, new RecordingChain()).block();
            assertTrue(allowedExchange.getResponse().getStatusCode() == null);
        }

        MockServerWebExchange blockedExchange = exchangeForPath("/browser-logs");
        filter.filter(blockedExchange, new RecordingChain()).block();

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, blockedExchange.getResponse().getStatusCode());
    }

    @SuppressWarnings("unchecked")
    private java.util.Set<String> cacheKeys() throws Exception {
        Field cacheField = RateLimitFilter.class.getDeclaredField("cache");
        cacheField.setAccessible(true);
        return ((Map<String, ?>) cacheField.get(filter)).keySet();
    }

    private static MockServerWebExchange exchangeFor(String token) {
        return MockServerWebExchange.from(
                MockServerHttpRequest.get("/workout/templates")
                        .header("Authorization", "Bearer " + token)
                        .build()
        );
    }

    private static MockServerWebExchange exchangeForPath(String path) {
        return MockServerWebExchange.from(
                MockServerHttpRequest.post(path).build()
        );
    }

    private static final class RecordingChain implements WebFilterChain {
        private final AtomicBoolean called = new AtomicBoolean(false);

        @Override
        public Mono<Void> filter(ServerWebExchange exchange) {
            called.set(true);
            return Mono.empty();
        }
    }
}
