package com.louisfiges.workout;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

@DisplayName("V17 split workout frequency migration")
class V17MigrationTest extends BaseIntegrationTest {

    static {
        System.setProperty("JWT_PUBLIC_KEY_B64",
                "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAriJ6FdmOBbl2RMuY6B2ygASe85zHOMSIxFp/MD7Vay/GynTIIxxBVx+6Jun9UCFpwsR4MjVOCWAEUzPJNlHDmsW9fan7hJwlzGl9mypfMVs1TgOB168cj/cqFIuusTAe0BRbkVeUBo65o2HG/FIF8jR54etfo5oczqt6puiwV7hTirTBiqd6O/uQDNI9GjeK1zJeWE9O19rhWHBuj+OO9kb1D+eWRAtacW7SItNC0OLLSuxDDDUWaJDE5D+juMCANrIL5A2/v7GjTPTVeT6ZVZLlJcitQCa27ezxomh+6P+T6VbG6rFSRTiMn/vuBr7HaI4f0TmruZ4jTSnMxWnwrQIDAQAB");
        System.setProperty("JWT_ISSUER", "mdes-secure-voip-auth");
    }

    @BeforeEach
    void prepareLegacySchema() throws Exception {
        prepareSchemaThroughMigrationVersion(16);
    }

    @Test
    @DisplayName("all split workout frequency schema statements execute cleanly")
    void allSplitWorkoutFrequencySchemaStatementsExecuteCleanly() throws Exception {
        String sql = new ClassPathResource("db/migration/V17__add_split_workout_frequencies.sql")
                .getContentAsString(StandardCharsets.UTF_8);

        assertThatCode(() ->
                Arrays.stream(sql.split(";"))
                        .map(String::trim)
                        .filter(statement -> !statement.isBlank())
                        .forEach(statement -> jdbcTemplate.execute(statement))
        ).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("split workout rows default to one session per week")
    void splitWorkoutRowsDefaultToOneSessionPerWeek() throws Exception {
        executeMigration();
        Integer defaultFrequencyColumn = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns " +
                        "WHERE LOWER(table_name) = 'split_workouts' AND LOWER(column_name) = 'sessions_per_week'",
                Integer.class
        );
        Integer validRange = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.check_constraints " +
                        "WHERE LOWER(constraint_name) = 'ck_split_workouts_sessions_per_week'",
                Integer.class
        );

        assertThat(defaultFrequencyColumn).isEqualTo(1);
        assertThat(validRange).isEqualTo(1);
    }

    private void executeMigration() throws Exception {
        String sql = new ClassPathResource("db/migration/V17__add_split_workout_frequencies.sql")
                .getContentAsString(StandardCharsets.UTF_8);

        Arrays.stream(sql.split(";"))
                .map(String::trim)
                .filter(statement -> !statement.isBlank())
                .forEach(statement -> jdbcTemplate.execute(statement));
    }
}
