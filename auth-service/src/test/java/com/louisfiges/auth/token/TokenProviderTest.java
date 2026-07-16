package com.louisfiges.auth.token;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TokenProviderTest {

    private static final UUID USER_ID = UUID.fromString("123e4567-e89b-12d3-a456-426614174000");
    private static String privateKeyB64;
    private static String publicKeyB64;

    @BeforeAll
    static void setUpKeys() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        KeyPair keyPair = generator.generateKeyPair();
        privateKeyB64 = Base64.getEncoder().encodeToString(keyPair.getPrivate().getEncoded());
        publicKeyB64 = Base64.getEncoder().encodeToString(keyPair.getPublic().getEncoded());
    }

    @AfterEach
    void clearProperties() {
        System.clearProperty("JWT_PRIVATE_KEY_B64");
        System.clearProperty("JWT_PUBLIC_KEY_B64");
        System.clearProperty("JWT_ISSUER");
    }

    @Test
    void userAccessTokensRoundTripWithConfiguredRsaKeys() {
        configureKeys("issuer-a");
        UserTokenProvider provider = new UserTokenProvider();

        String token = provider.generateAccessToken(USER_ID, "alice");
        Optional<UUID> validatedUserId = provider.validateAndGetUserId(token);

        assertTrue(validatedUserId.isPresent());
        assertEquals(USER_ID, validatedUserId.orElseThrow());
    }

    @Test
    void issuerMismatchIsRejected() {
        configureKeys("issuer-a");
        UserTokenProvider issuingProvider = new UserTokenProvider();
        String token = issuingProvider.generateAccessToken(USER_ID, "alice");

        configureKeys("issuer-b");
        UserTokenProvider verifyingProvider = new UserTokenProvider();

        assertTrue(verifyingProvider.validateAndGetUserId(token).isEmpty());
    }

    private void configureKeys(String issuer) {
        System.setProperty("JWT_PRIVATE_KEY_B64", privateKeyB64);
        System.setProperty("JWT_PUBLIC_KEY_B64", publicKeyB64);
        System.setProperty("JWT_ISSUER", issuer);
    }
}
