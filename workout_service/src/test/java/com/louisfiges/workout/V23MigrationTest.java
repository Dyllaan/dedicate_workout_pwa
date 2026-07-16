package com.louisfiges.workout;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("V23 exercise focus migration")
class V23MigrationTest extends BaseIntegrationTest {

    static {
        System.setProperty("JWT_PUBLIC_KEY_B64",
                "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAriJ6FdmOBbl2RMuY6B2ygASe85zHOMSIxFp/MD7Vay/GynTIIxxBVx+6Jun9UCFpwsR4MjVOCWAEUzPJNlHDmsW9fan7hJwlzGl9mypfMVs1TgOB168cj/cqFIuusTAe0BRbkVeUBo65o2HG/FIF8jR54etfo5oczqt6puiwV7hTirTBiqd6O/uQDNI9GjeK1zJeWE9O19rhWHBuj+OO9kb1D+eWRAtacW7SItNC0OLLSuxDDDUWaJDE5D+juMCANrIL5A2/v7GjTPTVeT6ZVZLlJcitQCa27ezxomh+6P+T6VbG6rFSRTiMn/vuBr7HaI4f0TmruZ4jTSnMxWnwrQIDAQAB");
        System.setProperty("JWT_ISSUER", "mdes-secure-voip-auth");
    }

    @BeforeEach
    void prepareLegacySchema() throws Exception {
        prepareSchemaThroughMigrationVersion(22);
    }

    @Test
    @DisplayName("adds exercise focus and programme focus columns with a working foreign key")
    void addsExerciseFocusAndProgrammeFocusColumnsWithWorkingForeignKey() throws Exception {
        executeMigration();

        UUID userId = UUID.randomUUID();
        UUID templateId = UUID.randomUUID();
        UUID exerciseConfigId = UUID.randomUUID();
        UUID exerciseDefinitionId = UUID.randomUUID();
        UUID programmeId = UUID.randomUUID();

        jdbcTemplate.update(
                "INSERT INTO exercise_definitions (id, user_id, exercise_name, variant, normalized_exercise_name, normalized_variant, mapping_source, created_at, updated_at) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())",
                exerciseDefinitionId,
                userId,
                "Bench Press",
                "Barbell",
                "bench press",
                "barbell",
                "AUTO"
        );
        jdbcTemplate.update(
                "INSERT INTO workout_templates (id, name, user_id, category, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP())",
                templateId,
                "Push Day",
                userId,
                "Strength"
        );
        jdbcTemplate.update(
                "INSERT INTO workout_exercises (workout_template_id, exercise_order, exercise_name, goal_sets, variant, exercise_config_id, exercise_definition_id, focus) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                templateId,
                0,
                "Bench Press",
                3,
                "Barbell",
                exerciseConfigId,
                exerciseDefinitionId,
                true
        );
        jdbcTemplate.update(
                "INSERT INTO programmes (id, created_at, start_date, active, goal_type, preset_type, archived, focus_exercise_config_id) " +
                        "VALUES (?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), TRUE, 'GENERAL_STRENGTH', 'CUSTOM', FALSE, ?)",
                programmeId,
                exerciseConfigId
        );

        UUID storedFocus = jdbcTemplate.queryForObject(
                "SELECT focus_exercise_config_id FROM programmes WHERE id = ?",
                UUID.class,
                programmeId
        );
        Boolean exerciseFocus = jdbcTemplate.queryForObject(
                "SELECT focus FROM workout_exercises WHERE exercise_config_id = ?",
                Boolean.class,
                exerciseConfigId
        );

        assertThat(storedFocus).isEqualTo(exerciseConfigId);
        assertThat(exerciseFocus).isTrue();

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO programmes (id, created_at, start_date, active, goal_type, preset_type, archived, focus_exercise_config_id) " +
                        "VALUES (?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), TRUE, 'GENERAL_STRENGTH', 'CUSTOM', FALSE, ?)",
                UUID.randomUUID(),
                UUID.randomUUID()
        )).isInstanceOf(Exception.class);
    }

    private void executeMigration() throws Exception {
        String sql = new ClassPathResource("db/migration/V23__exercise_focus_and_programme_focus.sql")
                .getContentAsString(StandardCharsets.UTF_8);

        Arrays.stream(sql.split(";"))
                .map(String::trim)
                .filter(statement -> !statement.isBlank())
                .forEach(statement -> jdbcTemplate.execute(statement));
    }
}
