package com.louisfiges.workout;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Workout application context")
class WorkoutApplicationContextTest extends BaseIntegrationTest {

    static {
        System.setProperty(
                "JWT_PUBLIC_KEY_B64",
                "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAriJ6FdmOBbl2RMuY6B2ygASe85zHOMSIxFp/MD7Vay/GynTIIxxBVx+6Jun9UCFpwsR4MjVOCWAEUzPJNlHDmsW9fan7hJwlzGl9mypfMVs1TgOB168cj/cqFIuusTAe0BRbkVeUBo65o2HG/FIF8jR54etfo5oczqt6puiwV7hTirTBiqd6O/uQDNI9GjeK1zJeWE9O19rhWHBuj+OO9kb1D+eWRAtacW7SItNC0OLLSuxDDDUWaJDE5D+juMCANrIL5A2/v7GjTPTVeT6ZVZLlJcitQCa27ezxomh+6P+T6VbG6rFSRTiMn/vuBr7HaI4f0TmruZ4jTSnMxWnwrQIDAQAB"
        );
        System.setProperty("JWT_ISSUER", "mdes-secure-voip-auth");
    }

    @Test
    @DisplayName("loads with both muscle heatmap services present")
    void loadsApplicationContext() {
        // Intentionally empty: BaseIntegrationTest startup is the assertion.
    }
}
