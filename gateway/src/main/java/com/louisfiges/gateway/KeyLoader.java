package com.louisfiges.gateway;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

public final class KeyLoader {

    private static final Logger logger = LoggerFactory.getLogger(KeyLoader.class);
    private static final String DEFAULT_ISSUER = "mdes-secure-voip-auth";

    private KeyLoader() {
    }

    public static RSAPublicKey loadPublicKeyFromEnv() {
        try {
            byte[] decodedKey = Base64.getDecoder().decode(loadRequiredSetting("JWT_PUBLIC_KEY_B64").replaceAll("\\s+", ""));
            RSAPublicKey publicKey = (RSAPublicKey) KeyFactory.getInstance("RSA")
                    .generatePublic(new X509EncodedKeySpec(decodedKey));
            logger.info("JWT public key loaded successfully");
            return publicKey;
        } catch (Exception e) {
            logger.error("Error loading JWT public key from env: {}", e.getMessage(), e);
            throw new IllegalStateException(
                    "Error loading JWT public key from env. Expected raw base64-encoded X.509 DER bytes.",
                    e
            );
        }
    }

    public static String loadIssuer() {
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
