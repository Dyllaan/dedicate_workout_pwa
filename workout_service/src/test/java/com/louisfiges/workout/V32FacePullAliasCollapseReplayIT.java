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

@DisplayName("V32 face pull alias collapse")
class V32FacePullAliasCollapseReplayIT extends BaseIntegrationTest {

    static {
        System.setProperty(
                "JWT_PUBLIC_KEY_B64",
                "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAriJ6FdmOBbl2RMuY6B2ygASe85zHOMSIxFp/MD7Vay/GynTIIxxBVx+6Jun9UCFpwsR4MjVOCWAEUzPJNlHDmsW9fan7hJwlzGl9mypfMVs1TgOB168cj/cqFIuusTAe0BRbkVeUBo65o2HG/FIF8jR54etfo5oczqt6puiwV7hTirTBiqd6O/uQDNI9GjeK1zJeWE9O19rhWHBuj+OO9kb1D+eWRAtacW7SItNC0OLLSuxDDDUWaJDE5D+juMCANrIL5A2/v7GjTPTVeT6ZVZLlJcitQCa27ezxomh+6P+T6VbG6rFSRTiMn/vuBr7HaI4f0TmruZ4jTSnMxWnwrQIDAQAB"
        );
        System.setProperty("JWT_ISSUER", "mdes-secure-voip-auth");
    }

    private static final UUID USER_LOUIS = UUID.fromString("76a41d5f-5e98-41a8-8467-2cbf96d27efb");
    private static final UUID USER_ZANDER = UUID.fromString("a33e8658-4694-4990-b329-a19bec29e059");

    private static final long FACE_PULL_INFO_ID = 620L;

    private static final UUID LOUIS_TEMPLATE_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID ZANDER_TEMPLATE_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID LOUIS_CONFIG_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID ZANDER_CONFIG_ID = UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final UUID LOUIS_WORKOUT_ENTRY_ID = UUID.fromString("55555555-5555-5555-5555-555555555555");
    private static final UUID ZANDER_WORKOUT_ENTRY_ID = UUID.fromString("66666666-6666-6666-6666-666666666666");

    private static final UUID LOUIS_CANONICAL_DEFINITION_ID = UUID.fromString("77777777-7777-7777-7777-777777777777");
    private static final UUID LOUIS_DUMBBELL_DEFINITION_ID = UUID.fromString("88888888-8888-8888-8888-888888888888");
    private static final UUID LOUIS_MACHINE_DEFINITION_ID = UUID.fromString("99999999-9999-9999-9999-999999999999");
    private static final UUID ZANDER_CANONICAL_DEFINITION_ID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static final UUID ZANDER_MACHINE_DEFINITION_ID = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    private static final UUID ZANDER_AUTO_DEFINITION_ID = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc");

    private static final UUID LOUIS_CANONICAL_ENTRY_ID = UUID.fromString("dddddddd-dddd-dddd-dddd-dddddddddddd");
    private static final UUID LOUIS_DUMBBELL_ENTRY_ID = UUID.fromString("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee");
    private static final UUID LOUIS_MACHINE_ENTRY_ID = UUID.fromString("ffffffff-ffff-ffff-ffff-ffffffffffff");
    private static final UUID ZANDER_CANONICAL_ENTRY_ID = UUID.fromString("12121212-1212-1212-1212-121212121212");
    private static final UUID ZANDER_MACHINE_ENTRY_ID = UUID.fromString("23232323-2323-2323-2323-232323232323");
    private static final UUID ZANDER_AUTO_ENTRY_ID = UUID.fromString("34343434-3434-3434-3434-343434343434");

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
    @DisplayName("collapses all Face Pull aliases onto one canonical row per user")
    void collapsesAllFacePullAliasesOntoOneCanonicalRowPerUser() throws Exception {
        applyMigration("db/migration/V32__collapse_face_pull_aliases.sql");

        assertThat(queryInt("""
                SELECT COUNT(*)
                FROM exercise_definitions
                WHERE user_id = '%s'
                  AND LOWER(exercise_name) IN (LOWER('Face Pull'), LOWER('Face pulls'), LOWER('Facepulls'))
                """.formatted(USER_LOUIS))).isEqualTo(1);
        assertThat(queryInt("""
                SELECT COUNT(*)
                FROM exercise_definitions
                WHERE user_id = '%s'
                  AND LOWER(exercise_name) IN (LOWER('Face Pull'), LOWER('Face pulls'), LOWER('Facepulls'))
                """.formatted(USER_ZANDER))).isEqualTo(1);
        assertThat(queryInt("""
                SELECT COUNT(*)
                FROM exercise_definitions
                WHERE LOWER(exercise_name) IN (LOWER('Face Pull'), LOWER('Face pulls'), LOWER('Facepulls'))
                """)).isEqualTo(2);

        assertThat(queryString("""
                SELECT exercise_name
                FROM exercise_definitions
                WHERE id = '%s'
                """.formatted(LOUIS_CANONICAL_DEFINITION_ID))).isEqualTo("Face Pull");
        assertThat(queryString("""
                SELECT COALESCE(variant, '')
                FROM exercise_definitions
                WHERE id = '%s'
                """.formatted(LOUIS_CANONICAL_DEFINITION_ID))).isEqualTo("");
        assertThat(queryLong("""
                SELECT exercise_info_id
                FROM exercise_definitions
                WHERE id = '%s'
                """.formatted(LOUIS_CANONICAL_DEFINITION_ID))).isEqualTo(FACE_PULL_INFO_ID);
        assertThat(queryString("""
                SELECT mapping_source
                FROM exercise_definitions
                WHERE id = '%s'
                """.formatted(LOUIS_CANONICAL_DEFINITION_ID))).isEqualTo("CATALOG");

        assertThat(queryString("""
                SELECT exercise_name
                FROM exercise_definitions
                WHERE id = '%s'
                """.formatted(ZANDER_CANONICAL_DEFINITION_ID))).isEqualTo("Face Pull");
        assertThat(queryString("""
                SELECT COALESCE(variant, '')
                FROM exercise_definitions
                WHERE id = '%s'
                """.formatted(ZANDER_CANONICAL_DEFINITION_ID))).isEqualTo("");
        assertThat(queryLong("""
                SELECT exercise_info_id
                FROM exercise_definitions
                WHERE id = '%s'
                """.formatted(ZANDER_CANONICAL_DEFINITION_ID))).isEqualTo(FACE_PULL_INFO_ID);
        assertThat(queryString("""
                SELECT mapping_source
                FROM exercise_definitions
                WHERE id = '%s'
                """.formatted(ZANDER_CANONICAL_DEFINITION_ID))).isEqualTo("CATALOG");

        assertThat(queryUuid("""
                SELECT exercise_definition_id
                FROM exercise_configs
                WHERE exercise_config_id = '%s'
                """.formatted(LOUIS_CONFIG_ID))).isEqualTo(LOUIS_CANONICAL_DEFINITION_ID);
        assertThat(queryUuid("""
                SELECT exercise_definition_id
                FROM exercise_configs
                WHERE exercise_config_id = '%s'
                """.formatted(ZANDER_CONFIG_ID))).isEqualTo(ZANDER_CANONICAL_DEFINITION_ID);

        assertThat(queryInt("""
                SELECT COUNT(*)
                FROM exercise_entries
                WHERE exercise_definition_id = '%s'
                """.formatted(LOUIS_CANONICAL_DEFINITION_ID))).isEqualTo(3);
        assertThat(queryInt("""
                SELECT COUNT(*)
                FROM exercise_entries
                WHERE exercise_definition_id = '%s'
                """.formatted(ZANDER_CANONICAL_DEFINITION_ID))).isEqualTo(3);

        assertThat(queryInt("""
                SELECT COUNT(*)
                FROM exercise_definitions
                WHERE id IN (
                    '%s',
                    '%s',
                    '%s',
                    '%s',
                    '%s',
                    '%s'
                )
                """.formatted(
                LOUIS_DUMBBELL_DEFINITION_ID,
                LOUIS_MACHINE_DEFINITION_ID,
                ZANDER_MACHINE_DEFINITION_ID,
                ZANDER_AUTO_DEFINITION_ID,
                LOUIS_CANONICAL_DEFINITION_ID,
                ZANDER_CANONICAL_DEFINITION_ID
        ))).isEqualTo(2);
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
                FACE_PULL_INFO_ID,
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
        insertDefinition(
                LOUIS_CANONICAL_DEFINITION_ID,
                USER_LOUIS,
                "Face Pull",
                null,
                "face_pull",
                "",
                FACE_PULL_INFO_ID,
                "CATALOG"
        );
        insertDefinition(
                LOUIS_DUMBBELL_DEFINITION_ID,
                USER_LOUIS,
                "Face Pull",
                "Dumbbell",
                "face_pull",
                "dumbbell",
                FACE_PULL_INFO_ID,
                "CATALOG"
        );
        insertDefinition(
                LOUIS_MACHINE_DEFINITION_ID,
                USER_LOUIS,
                "Face Pull",
                "Calf raise machine",
                "face_pull",
                "calf raise machine",
                FACE_PULL_INFO_ID,
                "CATALOG"
        );
        insertDefinition(
                ZANDER_CANONICAL_DEFINITION_ID,
                USER_ZANDER,
                "Face pulls",
                null,
                "face_pulls",
                "",
                FACE_PULL_INFO_ID,
                "CATALOG"
        );
        insertDefinition(
                ZANDER_MACHINE_DEFINITION_ID,
                USER_ZANDER,
                "Face pulls",
                "Machine",
                "face_pulls",
                "machine",
                FACE_PULL_INFO_ID,
                "CATALOG"
        );
        insertDefinition(
                ZANDER_AUTO_DEFINITION_ID,
                USER_ZANDER,
                "Facepulls",
                null,
                "facepulls",
                "",
                null,
                "AUTO"
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
                LOUIS_TEMPLATE_ID,
                USER_LOUIS,
                "Pull Day",
                "Pull"
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
                ZANDER_TEMPLATE_ID,
                USER_ZANDER,
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
                LOUIS_CONFIG_ID,
                LOUIS_MACHINE_DEFINITION_ID,
                LOUIS_TEMPLATE_ID,
                0,
                3,
                8,
                "WEIGHT_FIRST",
                "WORKING_SETS",
                90,
                false
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
                ZANDER_CONFIG_ID,
                ZANDER_AUTO_DEFINITION_ID,
                ZANDER_TEMPLATE_ID,
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
                LOUIS_WORKOUT_ENTRY_ID,
                LOUIS_TEMPLATE_ID,
                USER_LOUIS,
                null
        );
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
                ZANDER_WORKOUT_ENTRY_ID,
                ZANDER_TEMPLATE_ID,
                USER_ZANDER,
                null
        );

        insertExerciseEntry(LOUIS_CANONICAL_ENTRY_ID, LOUIS_WORKOUT_ENTRY_ID, LOUIS_CANONICAL_DEFINITION_ID, "Face Pull", null, 0);
        insertExerciseEntry(LOUIS_DUMBBELL_ENTRY_ID, LOUIS_WORKOUT_ENTRY_ID, LOUIS_DUMBBELL_DEFINITION_ID, "Face Pull", "Dumbbell", 1);
        insertExerciseEntry(LOUIS_MACHINE_ENTRY_ID, LOUIS_WORKOUT_ENTRY_ID, LOUIS_MACHINE_DEFINITION_ID, "Face Pull", "Calf raise machine", 2);

        insertExerciseEntry(ZANDER_CANONICAL_ENTRY_ID, ZANDER_WORKOUT_ENTRY_ID, ZANDER_CANONICAL_DEFINITION_ID, "Face pulls", null, 0);
        insertExerciseEntry(ZANDER_MACHINE_ENTRY_ID, ZANDER_WORKOUT_ENTRY_ID, ZANDER_MACHINE_DEFINITION_ID, "Face pulls", "Machine", 1);
        insertExerciseEntry(ZANDER_AUTO_ENTRY_ID, ZANDER_WORKOUT_ENTRY_ID, ZANDER_AUTO_DEFINITION_ID, "Facepulls", null, 2);
    }

    private void insertDefinition(
            UUID definitionId,
            UUID userId,
            String exerciseName,
            String variant,
            String normalizedExerciseName,
            String normalizedVariant,
            Long exerciseInfoId,
            String mappingSource
    ) {
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
                definitionId,
                userId,
                exerciseName,
                variant,
                normalizedExerciseName,
                normalizedVariant,
                exerciseInfoId,
                mappingSource,
                null
        );
    }

    private void insertExerciseEntry(
            UUID entryId,
            UUID workoutEntryId,
            UUID definitionId,
            String loggedExerciseName,
            String loggedVariant,
            int exerciseOrder
    ) {
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
                entryId,
                workoutEntryId,
                definitionId,
                loggedExerciseName,
                loggedVariant,
                3,
                exerciseOrder
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

    private Long queryLong(String sql) {
        return jdbcTemplate.queryForObject(sql, Long.class);
    }
}
