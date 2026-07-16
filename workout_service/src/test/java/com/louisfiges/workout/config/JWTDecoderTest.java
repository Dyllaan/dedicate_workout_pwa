package com.louisfiges.workout.config;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.JwtException;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JWTDecoderTest {

    private static final UUID USER_ID = UUID.fromString("123e4567-e89b-12d3-a456-426614174000");
    private static KeyPair keyPair;
    private final JWTDecoder decoderFactory = new JWTDecoder() { };

    @BeforeAll
    static void setUpKeys() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        keyPair = generator.generateKeyPair();
    }

    @AfterEach
    void clearProperties() {
        System.clearProperty("JWT_PUBLIC_KEY_B64");
        System.clearProperty("JWT_ISSUER");
    }

    @Test
    void decodesValidAccessToken() {
        configure("mdes-secure-voip-auth");

        org.springframework.security.oauth2.jwt.Jwt jwt = decoderFactory.jwtDecoder().decode(validToken());

        assertEquals(USER_ID.toString(), jwt.getSubject());
    }

    @Test
    void rejectsInvalidSignature() throws Exception {
        configure("mdes-secure-voip-auth");
        KeyPair otherKeyPair = generateKeyPair();
        String token = token(otherKeyPair, "mdes-secure-voip-auth", List.of("voip-services"), "access", Instant.now().plusSeconds(300));

        assertThrows(JwtException.class, () -> decoderFactory.jwtDecoder().decode(token));
    }

    @Test
    void rejectsWrongIssuer() {
        configure("mdes-secure-voip-auth");
        String token = token(keyPair, "wrong-issuer", List.of("voip-services"), "access", Instant.now().plusSeconds(300));

        assertThrows(JwtException.class, () -> decoderFactory.jwtDecoder().decode(token));
    }

    @Test
    void rejectsWrongAudience() {
        configure("mdes-secure-voip-auth");
        String token = token(keyPair, "mdes-secure-voip-auth", List.of("auth-service"), "access", Instant.now().plusSeconds(300));

        assertThrows(JwtException.class, () -> decoderFactory.jwtDecoder().decode(token));
    }

    @Test
    void rejectsWrongTokenUse() {
        configure("mdes-secure-voip-auth");
        String token = token(keyPair, "mdes-secure-voip-auth", List.of("voip-services"), "refresh", Instant.now().plusSeconds(300));

        assertThrows(JwtException.class, () -> decoderFactory.jwtDecoder().decode(token));
    }

    @Test
    void failsFastWhenPublicKeyMissing() {
        RuntimeException error = assertThrows(RuntimeException.class, () -> decoderFactory.jwtDecoder());

        assertEquals("Failed to create JwtDecoder", error.getMessage());
    }

    private void configure(String issuer) {
        System.setProperty("JWT_PUBLIC_KEY_B64", Base64.getEncoder().encodeToString(keyPair.getPublic().getEncoded()));
        System.setProperty("JWT_ISSUER", issuer);
    }

    private String validToken() {
        return token(keyPair, "mdes-secure-voip-auth", List.of("voip-services"), "access", Instant.now().plusSeconds(300));
    }

    private static String token(KeyPair signingKeys, String issuer, Object audience, String tokenUse, Instant expiry) {
        return Jwts.builder()
                .setSubject(USER_ID.toString())
                .setIssuer(issuer)
                .claim("aud", audience)
                .claim("token_use", tokenUse)
                .setId(UUID.randomUUID().toString())
                .setIssuedAt(Date.from(Instant.now().minusSeconds(5)))
                .setExpiration(Date.from(expiry))
                .signWith(signingKeys.getPrivate(), SignatureAlgorithm.RS256)
                .compact();
    }

    private static KeyPair generateKeyPair() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        return generator.generateKeyPair();
    }
}
