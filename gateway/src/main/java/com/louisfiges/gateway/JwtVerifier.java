package com.louisfiges.gateway;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;

import java.security.interfaces.RSAPublicKey;

final class JwtVerifier {

    private final RSAPublicKey verificationKey;
    private final JwtAccessTokenClaimsValidator claimsValidator;

    JwtVerifier() {
        this(KeyLoader.loadPublicKeyFromEnv(), KeyLoader.loadIssuer());
    }

    JwtVerifier(RSAPublicKey verificationKey, String issuer) {
        this.verificationKey = verificationKey;
        this.claimsValidator = new JwtAccessTokenClaimsValidator(issuer);
    }

    Claims parseAccessToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(verificationKey)
                .build()
                .parseClaimsJws(token)
                .getBody();

        claimsValidator.validate(claims);
        return claims;
    }
}
