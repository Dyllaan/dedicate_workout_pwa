package com.louisfiges.gateway;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.security.KeyPair;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtAuthFilterTest {

    private static KeyPair validKeyPair;
    private static JwtAuthFilter filter;

    @BeforeAll
    static void setUp() throws Exception {
        validKeyPair = JwtTestTokens.generateKeyPair();
        filter = new JwtAuthFilter(new JwtVerifier(
                (java.security.interfaces.RSAPublicKey) validKeyPair.getPublic(),
                JwtTestTokens.ISSUER
        ));
    }

    @Test
    void rejectsRequestWithoutBearerToken() {
        RecordingChain chain = new RecordingChain();
        MockServerWebExchange exchange = exchangeFor("/workout/templates", null);

        filter.filter(exchange, chain).block();

        assertEquals(HttpStatus.FORBIDDEN, exchange.getResponse().getStatusCode());
        assertTrue(!chain.wasCalled().get());
    }

    @Test
    void allowsNonApiBrowserPathsToFallThrough() {
        RecordingChain chain = new RecordingChain();
        MockServerWebExchange exchange = exchangeFor("/dashboard", null);

        filter.filter(exchange, chain).block();

        assertTrue(chain.wasCalled().get());
        assertNull(exchange.getResponse().getStatusCode());
    }

    @Test
    void allowsHealthAndVersionPathsWithoutAuth() {
        RecordingChain chain = new RecordingChain();
        MockServerWebExchange healthExchange = exchangeFor("/actuator/health", null);
        MockServerWebExchange versionExchange = exchangeFor("/version", null);
        MockServerWebExchange serviceStatusExchange = exchangeFor("/service-status", null);

        filter.filter(healthExchange, chain).block();
        filter.filter(versionExchange, chain).block();
        filter.filter(serviceStatusExchange, chain).block();

        assertTrue(chain.wasCalled().get());
        assertNull(healthExchange.getResponse().getStatusCode());
        assertNull(versionExchange.getResponse().getStatusCode());
        assertNull(serviceStatusExchange.getResponse().getStatusCode());
    }

    @Test
    void allowsValidAccessToken() {
        RecordingChain chain = new RecordingChain();
        String token = JwtTestTokens.accessToken(validKeyPair.getPrivate());
        MockServerWebExchange exchange = exchangeFor("/workout/templates", token);

        filter.filter(exchange, chain).block();

        assertTrue(chain.wasCalled().get());
        assertNull(exchange.getResponse().getStatusCode());
    }

    @Test
    void rejectsTokenWithInvalidSignature() throws Exception {
        RecordingChain chain = new RecordingChain();
        KeyPair otherKeyPair = JwtTestTokens.generateKeyPair();
        String token = JwtTestTokens.accessToken(otherKeyPair.getPrivate());
        MockServerWebExchange exchange = exchangeFor("/workout/templates", token);

        filter.filter(exchange, chain).block();

        assertEquals(HttpStatus.FORBIDDEN, exchange.getResponse().getStatusCode());
        assertTrue(!chain.wasCalled().get());
    }

    @Test
    void rejectsExpiredToken() {
        RecordingChain chain = new RecordingChain();
        String token = JwtTestTokens.token(
                validKeyPair.getPrivate(),
                JwtTestTokens.ISSUER,
                List.of("voip-services"),
                "access",
                Instant.now().minusSeconds(5)
        );
        MockServerWebExchange exchange = exchangeFor("/workout/templates", token);

        filter.filter(exchange, chain).block();

        assertEquals(HttpStatus.FORBIDDEN, exchange.getResponse().getStatusCode());
        assertTrue(!chain.wasCalled().get());
    }

    @Test
    void rejectsWrongIssuer() {
        RecordingChain chain = new RecordingChain();
        String token = JwtTestTokens.token(
                validKeyPair.getPrivate(),
                "wrong-issuer",
                List.of("voip-services"),
                "access",
                Instant.now().plusSeconds(300)
        );
        MockServerWebExchange exchange = exchangeFor("/workout/templates", token);

        filter.filter(exchange, chain).block();

        assertEquals(HttpStatus.FORBIDDEN, exchange.getResponse().getStatusCode());
        assertTrue(!chain.wasCalled().get());
    }

    @Test
    void rejectsWrongAudience() {
        RecordingChain chain = new RecordingChain();
        String token = JwtTestTokens.token(
                validKeyPair.getPrivate(),
                JwtTestTokens.ISSUER,
                List.of("auth-service"),
                "access",
                Instant.now().plusSeconds(300)
        );
        MockServerWebExchange exchange = exchangeFor("/workout/templates", token);

        filter.filter(exchange, chain).block();

        assertEquals(HttpStatus.FORBIDDEN, exchange.getResponse().getStatusCode());
        assertTrue(!chain.wasCalled().get());
    }

    @Test
    void rejectsWrongTokenUse() {
        RecordingChain chain = new RecordingChain();
        String token = JwtTestTokens.token(
                validKeyPair.getPrivate(),
                JwtTestTokens.ISSUER,
                List.of("voip-services"),
                "refresh",
                Instant.now().plusSeconds(300)
        );
        MockServerWebExchange exchange = exchangeFor("/workout/templates", token);

        filter.filter(exchange, chain).block();

        assertEquals(HttpStatus.FORBIDDEN, exchange.getResponse().getStatusCode());
        assertTrue(!chain.wasCalled().get());
    }

    private static MockServerWebExchange exchangeFor(String path, String token) {
        MockServerHttpRequest.BaseBuilder<?> requestBuilder = MockServerHttpRequest.get(path);
        if (token != null) {
            requestBuilder.header("Authorization", "Bearer " + token);
        }
        return MockServerWebExchange.from(requestBuilder.build());
    }

    private static final class RecordingChain implements WebFilterChain {
        private final AtomicBoolean called = new AtomicBoolean(false);

        @Override
        public Mono<Void> filter(ServerWebExchange exchange) {
            called.set(true);
            return Mono.empty();
        }

        AtomicBoolean wasCalled() {
            return called;
        }
    }
}
