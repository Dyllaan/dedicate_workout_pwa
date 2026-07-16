package com.louisfiges.workout.config;

import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

final class JwtKeyLoader {

    private static final String DEFAULT_ISSUER = "mdes-secure-voip-auth";

    private JwtKeyLoader() {
    }

    static RSAPublicKey loadPublicKey() {
        try {
            byte[] decodedKey = Base64.getDecoder().decode(loadRequiredSetting("JWT_PUBLIC_KEY_B64").replaceAll("\\s+", ""));
            return (RSAPublicKey) KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(decodedKey));
        } catch (Exception e) {
            throw new IllegalStateException(
                    "Failed to load JWT public key. Expected raw base64-encoded X.509 DER bytes.",
                    e
            );
        }
    }

    static String loadIssuer() {
        String issuer = System.getProperty("JWT_ISSUER");
        if (issuer == null || issuer.isBlank()) {
            issuer = System.getenv("JWT_ISSUER");
        }
        return (issuer == null || issuer.isBlank()) ? DEFAULT_ISSUER : issuer.trim();
    }

    private static String loadRequiredSetting(String settingName) {
        String value = System.getProperty(settingName);
        if (value == null || value.isBlank()) {
            value = System.getenv(settingName);
        }
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(settingName + " is not set");
        }
        return value;
    }
}
