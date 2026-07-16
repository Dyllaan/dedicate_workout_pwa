package com.louisfiges.gateway;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.security.KeyPair;
import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JwtVerifierTest {

    private static KeyPair keyPair;
    private static JwtVerifier jwtVerifier;

    @BeforeAll
    static void setUp() throws Exception {
        keyPair = JwtTestTokens.generateKeyPair();
        jwtVerifier = new JwtVerifier((java.security.interfaces.RSAPublicKey) keyPair.getPublic(), JwtTestTokens.ISSUER);
    }

    @Test
    void parseAccessTokenAcceptsValidAccessToken() {
        Claims claims = jwtVerifier.parseAccessToken(JwtTestTokens.accessToken(keyPair.getPrivate()));

        assertEquals(JwtTestTokens.USER_ID.toString(), claims.getSubject());
    }

    @Test
    void parseAccessTokenRejectsWrongIssuer() {
        String token = JwtTestTokens.token(
                keyPair.getPrivate(),
                "wrong-issuer",
                List.of("voip-services"),
                "access",
                Instant.now().plusSeconds(300)
        );

        assertThrows(JwtException.class, () -> jwtVerifier.parseAccessToken(token));
    }

    @Test
    void parseAccessTokenRejectsWrongAudience() {
        String token = JwtTestTokens.token(
                keyPair.getPrivate(),
                JwtTestTokens.ISSUER,
                List.of("auth-service"),
                "access",
                Instant.now().plusSeconds(300)
        );

        assertThrows(JwtException.class, () -> jwtVerifier.parseAccessToken(token));
    }

    @Test
    void parseAccessTokenRejectsWrongTokenUse() {
        String token = JwtTestTokens.token(
                keyPair.getPrivate(),
                JwtTestTokens.ISSUER,
                List.of("voip-services"),
                "refresh",
                Instant.now().plusSeconds(300)
        );

        assertThrows(JwtException.class, () -> jwtVerifier.parseAccessToken(token));
    }

    @Test
    void parseAccessTokenRejectsExpiredToken() {
        String token = JwtTestTokens.token(
                keyPair.getPrivate(),
                JwtTestTokens.ISSUER,
                List.of("voip-services"),
                "access",
                Instant.now().minusSeconds(5)
        );

        assertThrows(JwtException.class, () -> jwtVerifier.parseAccessToken(token));
    }
}
