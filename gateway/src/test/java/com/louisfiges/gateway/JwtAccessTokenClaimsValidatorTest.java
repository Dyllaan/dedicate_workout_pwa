package com.louisfiges.gateway;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class JwtAccessTokenClaimsValidatorTest {

    private final JwtAccessTokenClaimsValidator validator =
            new JwtAccessTokenClaimsValidator(JwtTestTokens.ISSUER);

    @Test
    void acceptsValidClaims() {
        Claims claims = mock(Claims.class);
        when(claims.getIssuer()).thenReturn(JwtTestTokens.ISSUER);
        when(claims.get("aud")).thenReturn(List.of(JwtAccessTokenClaimsValidator.ACCESS_AUDIENCE));
        when(claims.get("token_use", String.class)).thenReturn(JwtAccessTokenClaimsValidator.ACCESS_TOKEN_USE);

        assertDoesNotThrow(() -> validator.validate(claims));
    }

    @Test
    void rejectsMissingAudience() {
        Claims claims = mock(Claims.class);
        when(claims.getIssuer()).thenReturn(JwtTestTokens.ISSUER);
        when(claims.get("aud")).thenReturn(null);
        when(claims.get("token_use", String.class)).thenReturn(JwtAccessTokenClaimsValidator.ACCESS_TOKEN_USE);

        assertThrows(JwtException.class, () -> validator.validate(claims));
    }
}
