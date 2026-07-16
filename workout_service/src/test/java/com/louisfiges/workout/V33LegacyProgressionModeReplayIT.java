package com.louisfiges.workout;

import com.louisfiges.workout.analysis.types.ProgressionMode;
import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.repository.ExerciseConfigRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("V33 legacy progression mode normalization")
class V33LegacyProgressionModeReplayIT extends BaseIntegrationTest {

    static {
        System.setProperty(
                "JWT_PUBLIC_KEY_B64",
                "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAriJ6FdmOBbl2RMuY6B2ygASe85zHOMSIxFp/MD7Vay/GynTIIxxBVx+6Jun9UCFpwsR4MjVOCWAEUzPJNlHDmsW9fan7hJwlzGl9mypfMVs1TgOB168cj/cqFIuusTAe0BRbkVeUBo65o2HG/FIF8jR54etfo5oczqt6puiwV7hTirTBiqd6O/uQDNI9GjeK1zJeWE9O19rhWHBuj+OO9kb1D+eWRAtacW7SItNC0OLLSuxDDDUWaJDE5D+juMCANrIL5A2/v7GjTPTVeT6ZVZLlJcitQCa27ezxomh+6P+T6VbG6rFSRTiMn/vuBr7HaI4f0TmruZ4jTSnMxWnwrQIDAQAB"
        );
        System.setProperty("JWT_ISSUER", "mdes-secure-voip-auth");
    }

    private static final UUID USER_ID = UUID.fromString("7b38e4ae-4b4f-4d9d-9158-73ed7d1ca111");
    private static final UUID TEMPLATE_ID = UUID.fromString("2b08bb0f-4db7-4a63-9c5a-8ac5aa29a222");
    private static final UUID CONFIG_ID = UUID.fromString("c7f7d19d-7ed8-4c54-b0a8-7fcbf07c8333");
    private static final UUID DEFINITION_ID = UUID.fromString("0b2c3d4e-5f60-4718-9abc-def012345678");

    @Autowired
    private ExerciseConfigRepository exerciseConfigRepository;

    @BeforeEach
    void prepareSchema() throws Exception {
        prepareSchemaThroughMigrationVersion(32);
        seedWorkoutTemplateWithLegacyProgressionMode();
    }

    @Test
    @DisplayName("rewrites legacy progression modes before JPA loads exercise configs")
    void rewritesLegacyProgressionModesBeforeJpaLoadsExerciseConfigs() throws Exception {
        applyMigration("db/migration/V33__normalize_legacy_progression_modes.sql");

        assertThat(jdbcTemplate.queryForObject(
                "SELECT progression_mode FROM exercise_configs WHERE exercise_config_id = ?",
                String.class,
                CONFIG_ID
        )).isEqualTo("WEIGHT_FIRST");

        ExerciseConfig config = exerciseConfigRepository
                .findByExerciseConfigIdAndWorkoutTemplateUserId(CONFIG_ID, USER_ID)
                .orElseThrow();

        assertThat(config.getProgressionMode()).isEqualTo(ProgressionMode.WEIGHT_FIRST);
        assertThat(config.toDTO().progressionMode()).isEqualTo(ProgressionMode.WEIGHT_FIRST);
    }

    private void seedWorkoutTemplateWithLegacyProgressionMode() {
        jdbcTemplate.update("""
                INSERT INTO exercise_definitions (
                    id,
                    user_id,
                    exercise_name,
                    variant,
                    normalized_exercise_name,
                    normalized_variant,
                    mapping_source,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                DEFINITION_ID,
                USER_ID,
                "Bench Press",
                "Barbell",
                "bench press",
                "barbell",
                "MANUAL"
        );

        jdbcTemplate.update("""
                INSERT INTO workout_templates (
                    id,
                    user_id,
                    name,
                    category
                )
                VALUES (?, ?, ?, ?)
                """,
                TEMPLATE_ID,
                USER_ID,
                "Push Day",
                "Push"
        );

        jdbcTemplate.update("""
                INSERT INTO exercise_configs (
                    exercise_config_id,
                    exercise_definition_id,
                    workout_template_id,
                    exercise_order,
                    goal_sets,
                    goal_reps,
                    progression_mode,
                    primary_benchmark,
                    target_rest_seconds,
                    focus
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                CONFIG_ID,
                DEFINITION_ID,
                TEMPLATE_ID,
                0,
                3,
                5,
                "COMPETITION_LIFT",
                "WORKING_SETS",
                120,
                false
        );
    }

    private void applyMigration(String classpathLocation) throws Exception {
        try (Connection connection = jdbcTemplate.getDataSource().getConnection()) {
            ScriptUtils.executeSqlScript(
                    connection,
                    new EncodedResource(new ClassPathResource(classpathLocation), StandardCharsets.UTF_8)
            );
        }
    }
}
