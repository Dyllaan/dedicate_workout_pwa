package com.louisfiges.gateway;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;

final class JwtTestTokens {

    static final String ISSUER = "mdes-secure-voip-auth";
    static final UUID USER_ID = UUID.fromString("123e4567-e89b-12d3-a456-426614174000");

    private JwtTestTokens() {
    }

    static KeyPair generateKeyPair() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        return generator.generateKeyPair();
    }

    static String accessToken(PrivateKey privateKey) {
        return token(privateKey, ISSUER, List.of("voip-services"), "access", Instant.now().plusSeconds(300));
    }

    static String token(PrivateKey privateKey, String issuer, Object audience, String tokenUse, Instant expiry) {
        return Jwts.builder()
                .setSubject(USER_ID.toString())
                .setIssuer(issuer)
                .claim("aud", audience)
                .claim("token_use", tokenUse)
                .setId(UUID.randomUUID().toString())
                .setIssuedAt(Date.from(Instant.now().minusSeconds(5)))
                .setExpiration(Date.from(expiry))
                .signWith(privateKey, SignatureAlgorithm.RS256)
                .compact();
    }
}
