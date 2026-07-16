package com.louisfiges.workout;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

@DisplayName("V20 programme preset type migration")
class V20MigrationTest extends BaseIntegrationTest {

    static {
        System.setProperty("JWT_PUBLIC_KEY_B64",
                "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAriJ6FdmOBbl2RMuY6B2ygASe85zHOMSIxFp/MD7Vay/GynTIIxxBVx+6Jun9UCFpwsR4MjVOCWAEUzPJNlHDmsW9fan7hJwlzGl9mypfMVs1TgOB168cj/cqFIuusTAe0BRbkVeUBo65o2HG/FIF8jR54etfo5oczqt6puiwV7hTirTBiqd6O/uQDNI9GjeK1zJeWE9O19rhWHBuj+OO9kb1D+eWRAtacW7SItNC0OLLSuxDDDUWaJDE5D+juMCANrIL5A2/v7GjTPTVeT6ZVZLlJcitQCa27ezxomh+6P+T6VbG6rFSRTiMn/vuBr7HaI4f0TmruZ4jTSnMxWnwrQIDAQAB");
        System.setProperty("JWT_ISSUER", "mdes-secure-voip-auth");
    }

    @BeforeEach
    void prepareLegacySchema() throws Exception {
        prepareSchemaThroughMigrationVersion(19);
    }

    @Test
    @DisplayName("all programme preset type migration statements execute cleanly")
    void allProgrammePresetTypeMigrationStatementsExecuteCleanly() throws Exception {
        String sql = new ClassPathResource("db/migration/V20__add_programme_preset_type.sql")
                .getContentAsString(StandardCharsets.UTF_8);

        assertThatCode(() ->
                Arrays.stream(sql.split(";"))
                        .map(String::trim)
                        .filter(statement -> !statement.isBlank())
                        .forEach(statement -> jdbcTemplate.execute(statement))
        ).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("legacy null preset values are backfilled to CUSTOM and column remains constrained")
    void legacyNullPresetValuesAreBackfilledToCustomAndColumnRemainsConstrained() throws Exception {
        jdbcTemplate.execute("ALTER TABLE programmes ADD COLUMN IF NOT EXISTS preset_type VARCHAR(50)");
        jdbcTemplate.execute(
                "INSERT INTO programmes (id, created_at, start_date, active, goal_type, preset_type) " +
                        "VALUES (RANDOM_UUID(), CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), TRUE, 'GENERAL_STRENGTH', NULL)"
        );

        executeMigration();

        Integer nullCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM programmes WHERE preset_type IS NULL",
                Integer.class
        );
        Integer customCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM programmes WHERE preset_type = 'CUSTOM'",
                Integer.class
        );
        String isNullable = jdbcTemplate.queryForObject(
                "SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS " +
                        "WHERE LOWER(TABLE_NAME) = 'programmes' AND LOWER(COLUMN_NAME) = 'preset_type'",
                String.class
        );
        String columnDefault = jdbcTemplate.queryForObject(
                "SELECT COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS " +
                        "WHERE LOWER(TABLE_NAME) = 'programmes' AND LOWER(COLUMN_NAME) = 'preset_type'",
                String.class
        );

        assertThat(nullCount).isEqualTo(0);
        assertThat(customCount).isGreaterThanOrEqualTo(1);
        assertThat(isNullable).isEqualToIgnoringCase("NO");
        assertThat(columnDefault).containsIgnoringCase("CUSTOM");
    }

    private void executeMigration() throws Exception {
        String sql = new ClassPathResource("db/migration/V20__add_programme_preset_type.sql")
                .getContentAsString(StandardCharsets.UTF_8);

        Arrays.stream(sql.split(";"))
                .map(String::trim)
                .filter(statement -> !statement.isBlank())
                .forEach(statement -> jdbcTemplate.execute(statement));
    }
}
