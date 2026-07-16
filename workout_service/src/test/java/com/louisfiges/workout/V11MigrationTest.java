package com.louisfiges.workout;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThatCode;

@DisplayName("V11 dashboard performance indexes migration")
class V11MigrationTest extends BaseIntegrationTest {

    static {
        System.setProperty("JWT_PUBLIC_KEY_B64",
                "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAriJ6FdmOBbl2RMuY6B2ygASe85zHOMSIxFp/MD7Vay/GynTIIxxBVx+6Jun9UCFpwsR4MjVOCWAEUzPJNlHDmsW9fan7hJwlzGl9mypfMVs1TgOB168cj/cqFIuusTAe0BRbkVeUBo65o2HG/FIF8jR54etfo5oczqt6puiwV7hTirTBiqd6O/uQDNI9GjeK1zJeWE9O19rhWHBuj+OO9kb1D+eWRAtacW7SItNC0OLLSuxDDDUWaJDE5D+juMCANrIL5A2/v7GjTPTVeT6ZVZLlJcitQCa27ezxomh+6P+T6VbG6rFSRTiMn/vuBr7HaI4f0TmruZ4jTSnMxWnwrQIDAQAB");
        System.setProperty("JWT_ISSUER", "mdes-secure-voip-auth");
    }

    @BeforeEach
    void prepareLegacySchema() throws Exception {
        prepareSchemaThroughMigrationVersion(10);
    }

    @Test
    @DisplayName("all index statements execute cleanly against the test schema")
    void allIndexStatementsExecuteCleanly() throws Exception {
        String sql = new ClassPathResource("db/migration/V11__dashboard_performance_indexes.sql")
                .getContentAsString(StandardCharsets.UTF_8);

        assertThatCode(() ->
                Arrays.stream(sql.split(";"))
                        .map(String::trim)
                        .filter(s -> !s.isBlank())
                        .forEach(stmt -> jdbcTemplate.execute(stmt))
        ).doesNotThrowAnyException();
    }
}
