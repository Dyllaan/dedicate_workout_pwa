package com.louisfiges.common;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class KeyLoaderTest {

    private static final String PRIVATE_SETTING = "TEST_PRIVATE_KEY_B64";
    private static final String PUBLIC_SETTING = "TEST_PUBLIC_KEY_B64";
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
        System.clearProperty(PRIVATE_SETTING);
        System.clearProperty(PUBLIC_SETTING);
        System.clearProperty("MISSING_SETTING");
    }

    @Test
    void loadPrivateKeyAcceptsRawBase64Der() {
        System.setProperty(PRIVATE_SETTING, privateKeyB64);

        assertDoesNotThrow(() -> KeyLoader.loadPrivateKey(PRIVATE_SETTING));
    }

    @Test
    void loadPublicKeyAcceptsRawBase64Der() {
        System.setProperty(PUBLIC_SETTING, publicKeyB64);

        assertDoesNotThrow(() -> KeyLoader.loadPublicKey(PUBLIC_SETTING));
    }

    @Test
    void loadPrivateKeyRejectsMalformedBase64() {
        System.setProperty(PRIVATE_SETTING, "not-base64");

        IllegalStateException error = assertThrows(
                IllegalStateException.class,
                () -> KeyLoader.loadPrivateKey(PRIVATE_SETTING)
        );

        assertTrue(error.getMessage().contains("raw base64-encoded PKCS#8 DER bytes"));
    }

    @Test
    void loadPublicKeyRejectsWrongKeyType() {
        System.setProperty(PUBLIC_SETTING, privateKeyB64);

        IllegalStateException error = assertThrows(
                IllegalStateException.class,
                () -> KeyLoader.loadPublicKey(PUBLIC_SETTING)
        );

        assertTrue(error.getMessage().contains("raw base64-encoded X.509 DER bytes"));
    }

    @Test
    void loadRequiredSettingFailsWhenMissing() {
        IllegalStateException error = assertThrows(
                IllegalStateException.class,
                () -> KeyLoader.loadRequiredSetting("MISSING_SETTING")
        );

        assertTrue(error.getMessage().contains("MISSING_SETTING is not set"));
    }
}
