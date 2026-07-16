package com.louisfiges.workout;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("V31 face pull definition repair")
class V31FacePullRepairReplayIT extends BaseIntegrationTest {

    static {
        System.setProperty(
                "JWT_PUBLIC_KEY_B64",
                "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAriJ6FdmOBbl2RMuY6B2ygASe85zHOMSIxFp/MD7Vay/GynTIIxxBVx+6Jun9UCFpwsR4MjVOCWAEUzPJNlHDmsW9fan7hJwlzGl9mypfMVs1TgOB168cj/cqFIuusTAe0BRbkVeUBo65o2HG/FIF8jR54etfo5oczqt6puiwV7hTirTBiqd6O/uQDNI9GjeK1zJeWE9O19rhWHBuj+OO9kb1D+eWRAtacW7SItNC0OLLSuxDDDUWaJDE5D+juMCANrIL5A2/v7GjTPTVeT6ZVZLlJcitQCa27ezxomh+6P+T6VbG6rFSRTiMn/vuBr7HaI4f0TmruZ4jTSnMxWnwrQIDAQAB"
        );
        System.setProperty("JWT_ISSUER", "mdes-secure-voip-auth");
    }

    private static final UUID USER_ID = UUID.fromString("76a41d5f-5e98-41a8-8467-2cbf96d27efb");
    private static final UUID TEMPLATE_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID CONFIG_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID WORKOUT_ENTRY_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID CANONICAL_DEFINITION_ID = UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final UUID ALIAS_DEFINITION_ID = UUID.fromString("55555555-5555-5555-5555-555555555555");
    private static final UUID EXERCISE_ENTRY_ID = UUID.fromString("66666666-6666-6666-6666-666666666666");

    @BeforeEach
    void prepareSchema() throws Exception {
        prepareSchemaThroughMigrationVersion(26);
        applyMigration("db/migration/V30_1__align_daos_with_entities.sql");
        seedCatalogLookupRows();
        seedFacePullCatalogRow();
        seedFacePullDefinitions();
        seedWorkoutHistory();
    }

    @Test
    @DisplayName("merges Face Pull aliases onto the canonical definition and preserves history")
    void mergesFacePullAliasesOntoTheCanonicalDefinitionAndPreservesHistory() throws Exception {
        applyMigration("db/migration/V31__repair_face_pull_definition_matching.sql");

        assertThat(queryInt("""
                SELECT COUNT(*)
                FROM exercise_definitions
                WHERE id = '%s'
                """.formatted(ALIAS_DEFINITION_ID))).isZero();
        assertThat(queryInt("""
                SELECT COUNT(*)
                FROM exercise_definitions
                WHERE id = '%s'
                """.formatted(CANONICAL_DEFINITION_ID))).isEqualTo(1);
        assertThat(queryString("""
                SELECT exercise_name
                FROM exercise_definitions
                WHERE id = '%s'
                """.formatted(CANONICAL_DEFINITION_ID))).isEqualTo("Face Pull");
        assertThat(queryString("""
                SELECT COALESCE(variant, '')
                FROM exercise_definitions
                WHERE id = '%s'
                """.formatted(CANONICAL_DEFINITION_ID))).isEqualTo("");
        assertThat(queryUuid("""
                SELECT exercise_definition_id
                FROM exercise_configs
                WHERE exercise_config_id = '%s'
                """.formatted(CONFIG_ID))).isEqualTo(CANONICAL_DEFINITION_ID);
        assertThat(queryUuid("""
                SELECT exercise_definition_id
                FROM exercise_entries
                WHERE id = '%s'
                """.formatted(EXERCISE_ENTRY_ID))).isEqualTo(CANONICAL_DEFINITION_ID);
        assertThat(queryInt("""
                SELECT COUNT(*)
                FROM exercise_entries
                WHERE exercise_definition_id = '%s'
                """.formatted(CANONICAL_DEFINITION_ID))).isEqualTo(1);
    }

    private void seedCatalogLookupRows() {
        jdbcTemplate.update("INSERT INTO exercise_catalog_equipment (id, name) VALUES (?, ?)", 1L, "Cable");
        jdbcTemplate.update("INSERT INTO exercise_catalog_utility (id, name) VALUES (?, ?)", 1L, "Basic or Auxiliary");
        jdbcTemplate.update("INSERT INTO exercise_catalog_mechanics (id, name) VALUES (?, ?)", 1L, "Compound");
        jdbcTemplate.update("INSERT INTO exercise_catalog_force (id, name) VALUES (?, ?)", 1L, "Pull");
        jdbcTemplate.update("INSERT INTO exercise_catalog_difficulty (level) VALUES (?)", 3);
        jdbcTemplate.update("INSERT INTO exercise_catalog_muscle_group (id, name) VALUES (?, ?)", 1L, "Rear Delt");
    }

    private void seedFacePullCatalogRow() {
        jdbcTemplate.update("""
                INSERT INTO exercise_info (
                    id,
                    name,
                    equipment_id,
                    variation,
                    utility_id,
                    mechanics_id,
                    force_id,
                    difficulty_id,
                    main_muscle_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                620L,
                "Face Pull",
                1L,
                "No",
                1L,
                1L,
                1L,
                3,
                1L
        );
    }

    private void seedFacePullDefinitions() {
        jdbcTemplate.update("""
                INSERT INTO exercise_definitions (
                    id,
                    user_id,
                    exercise_name,
                    variant,
                    normalized_exercise_name,
                    normalized_variant,
                    exercise_info_id,
                    mapping_source,
                    primary_muscle,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                CANONICAL_DEFINITION_ID,
                USER_ID,
                "Face Pull",
                null,
                "face_pull",
                "",
                620L,
                "CATALOG",
                null
        );
        jdbcTemplate.update("""
                INSERT INTO exercise_definitions (
                    id,
                    user_id,
                    exercise_name,
                    variant,
                    normalized_exercise_name,
                    normalized_variant,
                    exercise_info_id,
                    mapping_source,
                    primary_muscle,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                ALIAS_DEFINITION_ID,
                USER_ID,
                "Face pulls",
                null,
                "face_pulls",
                "",
                620L,
                "CATALOG",
                null
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
                "Pull Day",
                "Pull"
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
                ALIAS_DEFINITION_ID,
                TEMPLATE_ID,
                0,
                3,
                8,
                "WEIGHT_FIRST",
                "WORKING_SETS",
                90,
                false
        );
    }

    private void seedWorkoutHistory() {
        jdbcTemplate.update("""
                INSERT INTO workout_entries (
                    id,
                    workout_template_id,
                    user_id,
                    notes,
                    created_at
                )
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                """,
                WORKOUT_ENTRY_ID,
                TEMPLATE_ID,
                USER_ID,
                null
        );

        jdbcTemplate.update("""
                INSERT INTO exercise_entries (
                    id,
                    workout_entry_id,
                    exercise_definition_id,
                    logged_exercise_name,
                    logged_variant,
                    goal_sets,
                    exercise_order
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                EXERCISE_ENTRY_ID,
                WORKOUT_ENTRY_ID,
                ALIAS_DEFINITION_ID,
                "Face pulls",
                null,
                3,
                0
        );
    }

    private void applyMigration(String classpathLocation) throws Exception {
        try (Connection connection = jdbcTemplate.getDataSource().getConnection()) {
            String sql;
            if ("db/migration/V30_1__align_daos_with_entities.sql".equals(classpathLocation)) {
                sql = """
                        CREATE TABLE IF NOT EXISTS exercise_configs (
                            exercise_config_id      UUID             NOT NULL PRIMARY KEY,
                            exercise_definition_id  UUID             NOT NULL REFERENCES exercise_definitions(id) ON DELETE CASCADE,
                            workout_template_id     UUID             NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
                            exercise_order          INTEGER          NOT NULL,
                            goal_sets               INTEGER          NOT NULL,
                            goal_reps               INTEGER,
                            target_rest_seconds     INTEGER,
                            focus                   BOOLEAN          DEFAULT FALSE
                        );

                        ALTER TABLE exercise_configs
                            ADD COLUMN IF NOT EXISTS progression_mode VARCHAR(32) DEFAULT 'WEIGHT_FIRST';
                        ALTER TABLE exercise_configs
                            ADD COLUMN IF NOT EXISTS primary_benchmark VARCHAR(32) DEFAULT 'WORKING_SETS';

                        CREATE TABLE IF NOT EXISTS split_workout_assignments (
                            id                  UUID             NOT NULL DEFAULT RANDOM_UUID() PRIMARY KEY,
                            split_id            UUID             NOT NULL REFERENCES splits(id) ON DELETE CASCADE,
                            workout_template_id UUID             NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
                            sessions_per_week   INTEGER          NOT NULL DEFAULT 1,
                            workout_order       INTEGER          NOT NULL,
                            CONSTRAINT uq_split_workout_assignments_split_template
                                UNIQUE (split_id, workout_template_id),
                            CONSTRAINT ck_split_workout_assignments_sessions_per_week
                                CHECK (sessions_per_week BETWEEN 1 AND 7)
                        );

                        ALTER TABLE programmes
                            ADD COLUMN IF NOT EXISTS split_id UUID REFERENCES splits(id) ON DELETE CASCADE;

                        ALTER TABLE exercise_entries
                            ADD COLUMN IF NOT EXISTS logged_exercise_name VARCHAR(255);
                        ALTER TABLE exercise_entries
                            ADD COLUMN IF NOT EXISTS logged_variant VARCHAR(255);
                        ALTER TABLE exercise_entries
                            DROP COLUMN IF EXISTS exercise_name;
                        ALTER TABLE exercise_entries
                            DROP COLUMN IF EXISTS variant;
                        ALTER TABLE exercise_entries
                            DROP COLUMN IF EXISTS exercise_info_id;

                        CREATE INDEX IF NOT EXISTS idx_exercise_configs_workout_template
                            ON exercise_configs(workout_template_id);
                        CREATE INDEX IF NOT EXISTS idx_exercise_configs_exercise_definition
                            ON exercise_configs(exercise_definition_id);
                        CREATE INDEX IF NOT EXISTS idx_split_workout_assignments_split
                            ON split_workout_assignments(split_id);
                        CREATE INDEX IF NOT EXISTS idx_split_workout_assignments_template
                            ON split_workout_assignments(workout_template_id);
                        CREATE INDEX IF NOT EXISTS idx_programmes_split_id
                            ON programmes(split_id);
                        """;
            } else {
                sql = new String(
                        new ClassPathResource(classpathLocation).getInputStream().readAllBytes(),
                        StandardCharsets.UTF_8
                )
                        .replace("gen_random_uuid()", "RANDOM_UUID()")
                        .replace("PRIMARY KEY DEFAULT RANDOM_UUID()", "DEFAULT RANDOM_UUID() PRIMARY KEY");
            }
            ScriptUtils.executeSqlScript(
                    connection,
                    new EncodedResource(new org.springframework.core.io.ByteArrayResource(sql.getBytes(StandardCharsets.UTF_8)) {
                        @Override
                        public String getDescription() {
                            return classpathLocation;
                        }
                    }, StandardCharsets.UTF_8)
            );
        }
    }

    private int queryInt(String sql) {
        Integer value = jdbcTemplate.queryForObject(sql, Integer.class);
        return value == null ? 0 : value;
    }

    private String queryString(String sql) {
        return jdbcTemplate.queryForObject(sql, String.class);
    }

    private UUID queryUuid(String sql) {
        return jdbcTemplate.queryForObject(sql, UUID.class);
    }
}
