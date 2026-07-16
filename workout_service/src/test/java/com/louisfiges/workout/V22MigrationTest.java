package com.louisfiges.workout;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("V22 single split per programme migration")
class V22MigrationTest extends BaseIntegrationTest {

    static {
        System.setProperty("JWT_PUBLIC_KEY_B64",
                "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAriJ6FdmOBbl2RMuY6B2ygASe85zHOMSIxFp/MD7Vay/GynTIIxxBVx+6Jun9UCFpwsR4MjVOCWAEUzPJNlHDmsW9fan7hJwlzGl9mypfMVs1TgOB168cj/cqFIuusTAe0BRbkVeUBo65o2HG/FIF8jR54etfo5oczqt6puiwV7hTirTBiqd6O/uQDNI9GjeK1zJeWE9O19rhWHBuj+OO9kb1D+eWRAtacW7SItNC0OLLSuxDDDUWaJDE5D+juMCANrIL5A2/v7GjTPTVeT6ZVZLlJcitQCa27ezxomh+6P+T6VbG6rFSRTiMn/vuBr7HaI4f0TmruZ4jTSnMxWnwrQIDAQAB");
        System.setProperty("JWT_ISSUER", "mdes-secure-voip-auth");
    }

    @BeforeEach
    void prepareLegacySchema() throws Exception {
        prepareSchemaThroughMigrationVersion(21);
    }

    @Test
    @DisplayName("split_programmes rejects assigning the same programme to multiple splits")
    void splitProgrammesRejectsAssigningTheSameProgrammeToMultipleSplits() throws Exception {
        executeMigration();

        UUID splitIdOne = UUID.randomUUID();
        UUID splitIdTwo = UUID.randomUUID();
        UUID programmeId = UUID.randomUUID();

        jdbcTemplate.update(
                "INSERT INTO splits (id, name, user_id, active, created_at) VALUES (?, ?, ?, FALSE, CURRENT_TIMESTAMP())",
                splitIdOne,
                "Split A",
                UUID.randomUUID()
        );
        jdbcTemplate.update(
                "INSERT INTO splits (id, name, user_id, active, created_at) VALUES (?, ?, ?, FALSE, CURRENT_TIMESTAMP())",
                splitIdTwo,
                "Split B",
                UUID.randomUUID()
        );
        jdbcTemplate.update(
                "INSERT INTO programmes (id, created_at, start_date, active, goal_type, preset_type, archived) " +
                        "VALUES (?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), TRUE, 'GENERAL_STRENGTH', 'CUSTOM', FALSE)",
                programmeId
        );

        jdbcTemplate.update(
                "INSERT INTO split_programmes (split_id, programme_id) VALUES (?, ?)",
                splitIdOne,
                programmeId
        );

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO split_programmes (split_id, programme_id) VALUES (?, ?)",
                splitIdTwo,
                programmeId
        )).isInstanceOf(Exception.class);
    }

    private void executeMigration() throws Exception {
        String sql = new ClassPathResource("db/migration/V22__enforce_single_split_per_programme.sql")
                .getContentAsString(StandardCharsets.UTF_8);

        Arrays.stream(sql.split(";"))
                .map(String::trim)
                .filter(statement -> !statement.isBlank())
                .forEach(statement -> jdbcTemplate.execute(statement));
    }
}
