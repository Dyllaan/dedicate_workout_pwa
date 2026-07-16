package com.louisfiges.gateway;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

import java.util.Collection;

final class JwtAccessTokenClaimsValidator {

    static final String ACCESS_TOKEN_USE = "access";
    static final String ACCESS_AUDIENCE = "voip-services";

    private final String issuer;

    JwtAccessTokenClaimsValidator(String issuer) {
        this.issuer = issuer;
    }

    void validate(Claims claims) {
        validateIssuer(claims);
        validateTokenUse(claims);
        validateAudience(claims);
    }

    private void validateIssuer(Claims claims) {
        if (!issuer.equals(claims.getIssuer())) {
            throw new JwtException("Token issuer mismatch");
        }
    }

    private void validateTokenUse(Claims claims) {
        if (!ACCESS_TOKEN_USE.equals(claims.get("token_use", String.class))) {
            throw new JwtException("Token use mismatch");
        }
    }

    private void validateAudience(Claims claims) {
        Object audienceClaim = claims.get("aud");
        if (audienceClaim instanceof String audience) {
            if (!ACCESS_AUDIENCE.equals(audience)) {
                throw new JwtException("Token audience mismatch");
            }
            return;
        }

        if (audienceClaim instanceof Collection<?> audiences && audiences.stream().anyMatch(ACCESS_AUDIENCE::equals)) {
            return;
        }

        throw new JwtException("Token audience mismatch");
    }
}
