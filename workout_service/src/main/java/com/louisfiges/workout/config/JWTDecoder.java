package com.louisfiges.workout.config;

import org.springframework.context.annotation.Bean;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import java.security.interfaces.RSAPublicKey;
import java.util.List;

public abstract class JWTDecoder {
    static final String ACCESS_AUDIENCE = "voip-services";
    static final String ACCESS_TOKEN_USE = "access";

    @Bean
    public org.springframework.security.oauth2.jwt.JwtDecoder jwtDecoder() {
        try {
            RSAPublicKey publicKey = JwtKeyLoader.loadPublicKey();
            NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(publicKey).build();
            decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                    JwtValidators.createDefaultWithIssuer(JwtKeyLoader.loadIssuer()),
                    audienceValidator(),
                    tokenUseValidator()
            ));
            return decoder;
        } catch (Exception e) {
            throw new RuntimeException("Failed to create JwtDecoder", e);
        }
    }

    private OAuth2TokenValidator<Jwt> audienceValidator() {
        return token -> {
            List<String> audiences = token.getAudience();
            if (audiences != null && audiences.contains(ACCESS_AUDIENCE)) {
                return OAuth2TokenValidatorResult.success();
            }
            return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Token audience mismatch", null));
        };
    }

    private OAuth2TokenValidator<Jwt> tokenUseValidator() {
        return token -> {
            if (ACCESS_TOKEN_USE.equals(token.getClaimAsString("token_use"))) {
                return OAuth2TokenValidatorResult.success();
            }
            return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Token use mismatch", null));
        };
    }
}

