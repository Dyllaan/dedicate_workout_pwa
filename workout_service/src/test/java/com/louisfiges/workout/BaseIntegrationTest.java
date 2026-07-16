package com.louisfiges.workout;

import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Base class for integration tests.
 * Provides common configuration and database cleanup.
 */
@SpringBootTest
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@TestPropertySource(locations = "classpath:application-test.properties")
public abstract class BaseIntegrationTest {

    private static final Pattern MIGRATION_VERSION_PATTERN = Pattern.compile("^V([0-9]+(?:_[0-9]+)*)__.*\\.sql$");

    @Autowired
    protected JdbcTemplate jdbcTemplate;

    protected void prepareSchemaThroughMigrationVersion(int targetVersion) throws Exception {
        jdbcTemplate.execute("DROP ALL OBJECTS");
        List<Integer> targetVersionParts = List.of(targetVersion);

        var resolver = new PathMatchingResourcePatternResolver();
        var resources = resolver.getResources("classpath*:db/migration/V*.sql");
        Arrays.stream(resources)
                .filter(resource -> compareMigrationVersions(migrationVersionParts(resource.getFilename()), targetVersionParts) <= 0)
                .sorted(Comparator.comparing(
                        resource -> migrationVersionParts(resource.getFilename()),
                        this::compareMigrationVersions
                ))
                .forEach(this::applyMigrationScript);
    }

    /**
     * Clean up database after each test to ensure test isolation.
     * Disables foreign key checks temporarily for H2.
     */
    @AfterEach
    void cleanupDatabase() {
        jdbcTemplate.execute("SET REFERENTIAL_INTEGRITY FALSE");

        List<String> tables = jdbcTemplate.queryForList(
                "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'PUBLIC'",
                String.class
        );

        for (String table : tables) {
            jdbcTemplate.execute("TRUNCATE TABLE " + table);
        }

        jdbcTemplate.execute("SET REFERENTIAL_INTEGRITY TRUE");
    }

    private void applyMigrationScript(org.springframework.core.io.Resource resource) {
        try (Connection connection = jdbcTemplate.getDataSource().getConnection()) {
            String sql = new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8)
                    .replace("gen_random_uuid()", "RANDOM_UUID()")
                    .replace("PRIMARY KEY DEFAULT RANDOM_UUID()", "DEFAULT RANDOM_UUID() PRIMARY KEY")
                    .replace("TIMESTAMPTZ", "TIMESTAMP WITH TIME ZONE")
                    .replace("ON exercise_info (name, COALESCE(variation, ''), COALESCE(equipment, ''))",
                            "ON exercise_info (name, variation, equipment)");
            if ("V10__add_powerlifting_intelligence.sql".equals(resource.getFilename())) {
                sql = sql.replace(
                        "ALTER TABLE workout_exercises\n" +
                                "    ADD COLUMN IF NOT EXISTS lift_role VARCHAR(50),\n" +
                                "    ADD COLUMN IF NOT EXISTS progression_mode VARCHAR(50),\n" +
                                "    ADD COLUMN IF NOT EXISTS microload_kg DOUBLE PRECISION,\n" +
                                "    ADD COLUMN IF NOT EXISTS include_in_competition_lift_trend BOOLEAN,\n" +
                                "    ADD COLUMN IF NOT EXISTS primary_benchmark VARCHAR(50);",
                        "ALTER TABLE workout_exercises\n" +
                                "    ADD COLUMN IF NOT EXISTS lift_role VARCHAR(50);\n" +
                                "ALTER TABLE workout_exercises\n" +
                                "    ADD COLUMN IF NOT EXISTS progression_mode VARCHAR(50);\n" +
                                "ALTER TABLE workout_exercises\n" +
                                "    ADD COLUMN IF NOT EXISTS microload_kg DOUBLE PRECISION;\n" +
                                "ALTER TABLE workout_exercises\n" +
                                "    ADD COLUMN IF NOT EXISTS include_in_competition_lift_trend BOOLEAN;\n" +
                                "ALTER TABLE workout_exercises\n" +
                                "    ADD COLUMN IF NOT EXISTS primary_benchmark VARCHAR(50);"
                );
                sql = sql.replace(
                        "ALTER TABLE programmes\n" +
                                "    ADD COLUMN IF NOT EXISTS goal_type VARCHAR(50) NOT NULL DEFAULT 'GENERAL_STRENGTH',\n" +
                                "    ADD COLUMN IF NOT EXISTS meet_date DATE;",
                        "ALTER TABLE programmes\n" +
                                "    ADD COLUMN IF NOT EXISTS goal_type VARCHAR(50) NOT NULL DEFAULT 'GENERAL_STRENGTH';\n" +
                        "ALTER TABLE programmes\n" +
                                "    ADD COLUMN IF NOT EXISTS meet_date DATE;"
                );
            }
            if ("V14__add_row_exercise_info.sql".equals(resource.getFilename())) {
                String conflictBlock = "\nON CONFLICT (name, (COALESCE(variation, '')), (COALESCE(equipment, '')))\n" +
                        "DO UPDATE SET\n" +
                        "    utility = EXCLUDED.utility,\n" +
                        "    mechanics = EXCLUDED.mechanics,\n" +
                        "    force = EXCLUDED.force,\n" +
                        "    preparation = EXCLUDED.preparation,\n" +
                        "    execution = EXCLUDED.execution,\n" +
                        "    target_muscles = EXCLUDED.target_muscles,\n" +
                        "    synergist_muscles = EXCLUDED.synergist_muscles,\n" +
                        "    stabilizer_muscles = EXCLUDED.stabilizer_muscles,\n" +
                        "    main_muscle = EXCLUDED.main_muscle,\n" +
                        "    difficulty = EXCLUDED.difficulty,\n" +
                        "    secondary_muscles = EXCLUDED.secondary_muscles;";
                sql = sql.replace(conflictBlock, ";");
            }
            if ("V19__unified_exercise_definitions.sql".equals(resource.getFilename())) {
                sql = sql.replace(
                        "ALTER TABLE workout_exercises\n" +
                                "    ADD COLUMN IF NOT EXISTS exercise_config_id UUID DEFAULT RANDOM_UUID(),\n" +
                                "    ADD COLUMN IF NOT EXISTS exercise_definition_id UUID REFERENCES exercise_definitions(id) ON DELETE SET NULL;",
                        "ALTER TABLE workout_exercises\n" +
                                "    ADD COLUMN IF NOT EXISTS exercise_config_id UUID DEFAULT RANDOM_UUID();\n" +
                        "ALTER TABLE workout_exercises\n" +
                                "    ADD COLUMN IF NOT EXISTS exercise_definition_id UUID REFERENCES exercise_definitions(id) ON DELETE SET NULL;"
                );
                sql = sql.replace(
                        "ALTER TABLE exercise_entries\n" +
                                "    ADD COLUMN IF NOT EXISTS exercise_definition_id UUID REFERENCES exercise_definitions(id) ON DELETE SET NULL,\n" +
                                "    ADD COLUMN IF NOT EXISTS logged_exercise_name VARCHAR(255),\n" +
                                "    ADD COLUMN IF NOT EXISTS logged_variant VARCHAR(255);",
                        "ALTER TABLE exercise_entries\n" +
                                "    ADD COLUMN IF NOT EXISTS exercise_definition_id UUID REFERENCES exercise_definitions(id) ON DELETE SET NULL;\n" +
                        "ALTER TABLE exercise_entries\n" +
                                "    ADD COLUMN IF NOT EXISTS logged_exercise_name VARCHAR(255);\n" +
                        "ALTER TABLE exercise_entries\n" +
                                "    ADD COLUMN IF NOT EXISTS logged_variant VARCHAR(255);"
                );
                sql = sql.replace(
                        "\nON CONFLICT (user_id, normalized_exercise_name, normalized_variant) DO NOTHING;",
                        ";"
                );
                sql = sql.replace(
                        "\nON CONFLICT (exercise_definition_id, muscle) DO NOTHING;",
                        ";"
                );
                sql = sql.replace(
                        "\nON CONFLICT (user_id, normalized_exercise_name, normalized_variant) DO UPDATE\n" +
                                "SET exercise_info_id = COALESCE(exercise_definitions.exercise_info_id, EXCLUDED.exercise_info_id),\n" +
                                "    mapping_source = EXCLUDED.mapping_source,\n" +
                                "    primary_muscle = COALESCE(EXCLUDED.primary_muscle, exercise_definitions.primary_muscle),\n" +
                                "    updated_at = now();",
                        ";"
                );
            }
            if ("V24__drop_workout_template_user_foreign_key.sql".equals(resource.getFilename())) {
                sql = "";
            } else if ("V30_1__align_daos_with_entities.sql".equals(resource.getFilename())) {
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
                sql = sql.replace(
                        "\nON CONFLICT (exercise_config_id) DO NOTHING;",
                        ";"
                );
                sql = sql.replace(
                        "\nON CONFLICT (split_id, workout_template_id) DO NOTHING;",
                        ";"
                );
                sql = sql.replace(
                        "ALTER TABLE exercise_configs\n" +
                                "    ALTER COLUMN progression_mode SET DEFAULT 'WEIGHT_FIRST',\n" +
                                "    ALTER COLUMN primary_benchmark SET DEFAULT 'WORKING_SETS';",
                        "ALTER TABLE exercise_configs\n" +
                                "    ALTER COLUMN progression_mode SET DEFAULT 'WEIGHT_FIRST';\n" +
                        "ALTER TABLE exercise_configs\n" +
                                "    ALTER COLUMN primary_benchmark SET DEFAULT 'WORKING_SETS';"
                );
                sql = sql.replace(
                        "ALTER TABLE exercise_configs\n" +
                                "    ALTER COLUMN progression_mode SET NOT NULL,\n" +
                                "    ALTER COLUMN primary_benchmark SET NOT NULL;",
                        "ALTER TABLE exercise_configs\n" +
                                "    ALTER COLUMN progression_mode SET NOT NULL;\n" +
                        "ALTER TABLE exercise_configs\n" +
                                "    ALTER COLUMN primary_benchmark SET NOT NULL;"
                );
                sql = sql.replace(
                        "UPDATE programmes p\n" +
                                "SET split_id = sp.split_id\n" +
                                "FROM split_programmes sp\n" +
                                "WHERE sp.programme_id = p.id\n" +
                                "  AND p.split_id IS NULL;",
                        ";"
                );
                sql = sql.replace(
                        "ALTER TABLE exercise_entries\n" +
                                "    DROP COLUMN IF EXISTS exercise_name,\n" +
                                "    DROP COLUMN IF EXISTS variant,\n" +
                                "    DROP COLUMN IF EXISTS exercise_info_id;",
                        "ALTER TABLE exercise_entries\n" +
                                "    DROP COLUMN IF EXISTS exercise_name;\n" +
                        "ALTER TABLE exercise_entries\n" +
                                "    DROP COLUMN IF EXISTS variant;\n" +
                        "ALTER TABLE exercise_entries\n" +
                                "    DROP COLUMN IF EXISTS exercise_info_id;"
                );
                sql = sql.replace(
                        "ALTER TABLE programmes\n" +
                                "    DROP COLUMN IF EXISTS goal_type,\n" +
                                "    DROP COLUMN IF EXISTS focus_exercise_config_id;",
                        "ALTER TABLE programmes\n" +
                                "    DROP COLUMN IF EXISTS goal_type;\n" +
                        "ALTER TABLE programmes\n" +
                                "    DROP COLUMN IF EXISTS focus_exercise_config_id;"
                );
                sql = sql.replace(
                        "ALTER TABLE exercise_configs\n" +
                                "    ADD COLUMN IF NOT EXISTS progression_mode VARCHAR(32) DEFAULT 'WEIGHT_FIRST',\n" +
                                "    ADD COLUMN IF NOT EXISTS primary_benchmark VARCHAR(32) DEFAULT 'WORKING_SETS';",
                        "ALTER TABLE exercise_configs\n" +
                                "    ADD COLUMN IF NOT EXISTS progression_mode VARCHAR(32) DEFAULT 'WEIGHT_FIRST';\n" +
                        "ALTER TABLE exercise_configs\n" +
                                "    ADD COLUMN IF NOT EXISTS primary_benchmark VARCHAR(32) DEFAULT 'WORKING_SETS';"
                );
                sql = sql.replace(
                        "INSERT INTO exercise_configs (\n" +
                                "    exercise_config_id,\n" +
                                "    exercise_definition_id,\n" +
                                "    workout_template_id,\n" +
                                "    exercise_order,\n" +
                                "    goal_sets,\n" +
                                "    goal_reps,\n" +
                                "    progression_mode,\n" +
                                "    primary_benchmark,\n" +
                                "    target_rest_seconds,\n" +
                                "    focus\n" +
                                ")\n" +
                                "SELECT\n" +
                                "    COALESCE(we.exercise_config_id, gen_random_uuid()) AS exercise_config_id,\n" +
                                "    we.exercise_definition_id,\n" +
                                "    we.workout_template_id,\n" +
                                "    we.exercise_order,\n" +
                                "    we.goal_sets,\n" +
                                "    we.goal_reps,\n" +
                                "    COALESCE(we.progression_mode, 'WEIGHT_FIRST') AS progression_mode,\n" +
                                "    COALESCE(we.primary_benchmark, 'WORKING_SETS') AS primary_benchmark,\n" +
                                "    we.target_rest_seconds,\n" +
                                "    COALESCE(we.focus, FALSE) AS focus\n" +
                                "FROM workout_exercises we\n" +
                                "WHERE we.exercise_definition_id IS NOT NULL\n" +
                                "ON CONFLICT (exercise_config_id) DO NOTHING;",
                        "INSERT INTO exercise_configs (\n" +
                                "    exercise_config_id,\n" +
                                "    exercise_definition_id,\n" +
                                "    workout_template_id,\n" +
                                "    exercise_order,\n" +
                                "    goal_sets,\n" +
                                "    goal_reps,\n" +
                                "    target_rest_seconds,\n" +
                                "    focus\n" +
                                ")\n" +
                                "SELECT\n" +
                                "    COALESCE(we.exercise_config_id, gen_random_uuid()) AS exercise_config_id,\n" +
                                "    we.exercise_definition_id,\n" +
                                "    we.workout_template_id,\n" +
                                "    we.exercise_order,\n" +
                                "    we.goal_sets,\n" +
                                "    we.goal_reps,\n" +
                                "    we.target_rest_seconds,\n" +
                                "    COALESCE(we.focus, FALSE) AS focus\n" +
                                "FROM workout_exercises we\n" +
                                "WHERE we.exercise_definition_id IS NOT NULL\n" +
                                "ON CONFLICT (exercise_config_id) DO NOTHING;"
                );
            }
            if ("V26__normalize_exercise_catalog.sql".equals(resource.getFilename())) {
                sql = """
                        CREATE TABLE IF NOT EXISTS exercise_catalog_equipment (
                            id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                            name VARCHAR(255) NOT NULL UNIQUE
                        );

                        CREATE TABLE IF NOT EXISTS exercise_catalog_utility (
                            id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                            name VARCHAR(255) NOT NULL UNIQUE
                        );

                        CREATE TABLE IF NOT EXISTS exercise_catalog_mechanics (
                            id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                            name VARCHAR(255) NOT NULL UNIQUE
                        );

                        CREATE TABLE IF NOT EXISTS exercise_catalog_force (
                            id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                            name VARCHAR(255) NOT NULL UNIQUE
                        );

                        CREATE TABLE IF NOT EXISTS exercise_catalog_difficulty (
                            level INTEGER PRIMARY KEY
                        );

                        CREATE TABLE IF NOT EXISTS exercise_catalog_muscle_group (
                            id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                            name VARCHAR(255) NOT NULL UNIQUE
                        );

                        CREATE TABLE IF NOT EXISTS exercise_info_muscles (
                            id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                            exercise_info_id BIGINT NOT NULL,
                            muscle_role VARCHAR(32) NOT NULL,
                            muscle_group_id BIGINT NOT NULL,
                            CONSTRAINT uq_exercise_info_muscles_identity
                                UNIQUE (exercise_info_id, muscle_role, muscle_group_id)
                        );

                        ALTER TABLE exercise_info
                            ADD COLUMN IF NOT EXISTS equipment_id BIGINT;
                        ALTER TABLE exercise_info
                            ADD COLUMN IF NOT EXISTS utility_id BIGINT;
                        ALTER TABLE exercise_info
                            ADD COLUMN IF NOT EXISTS mechanics_id BIGINT;
                        ALTER TABLE exercise_info
                            ADD COLUMN IF NOT EXISTS force_id BIGINT;
                        ALTER TABLE exercise_info
                            ADD COLUMN IF NOT EXISTS difficulty_id INTEGER;
                        ALTER TABLE exercise_info
                            ADD COLUMN IF NOT EXISTS main_muscle_id BIGINT;

                        DROP INDEX IF EXISTS idx_exercise_info_name_variation_equipment;

                        ALTER TABLE exercise_info
                            DROP COLUMN IF EXISTS equipment;
                        ALTER TABLE exercise_info
                            DROP COLUMN IF EXISTS utility;
                        ALTER TABLE exercise_info
                            DROP COLUMN IF EXISTS mechanics;
                        ALTER TABLE exercise_info
                            DROP COLUMN IF EXISTS force;
                        ALTER TABLE exercise_info
                            DROP COLUMN IF EXISTS target_muscles;
                        ALTER TABLE exercise_info
                            DROP COLUMN IF EXISTS synergist_muscles;
                        ALTER TABLE exercise_info
                            DROP COLUMN IF EXISTS stabilizer_muscles;
                        ALTER TABLE exercise_info
                            DROP COLUMN IF EXISTS antagonist_muscles;
                        ALTER TABLE exercise_info
                            DROP COLUMN IF EXISTS dynamic_stabilizer_muscles;
                        ALTER TABLE exercise_info
                            DROP COLUMN IF EXISTS main_muscle;
                        ALTER TABLE exercise_info
                            DROP COLUMN IF EXISTS difficulty;
                        ALTER TABLE exercise_info
                            DROP COLUMN IF EXISTS secondary_muscles;
                        """;
            }
            if (sql.isBlank()) {
                return;
            }
            ByteArrayResource rewritten = new ByteArrayResource(sql.getBytes(StandardCharsets.UTF_8)) {
                @Override
                public String getDescription() {
                    return resource.getFilename();
                }
            };
            ScriptUtils.executeSqlScript(connection, new EncodedResource(rewritten, StandardCharsets.UTF_8));
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to apply migration script " + resource.getFilename(), exception);
        }
    }

    private List<Integer> migrationVersionParts(String filename) {
        Matcher matcher = MIGRATION_VERSION_PATTERN.matcher(filename);
        if (!matcher.matches()) {
            throw new IllegalArgumentException("Unexpected migration filename: " + filename);
        }
        return Arrays.stream(matcher.group(1).split("_"))
                .map(Integer::parseInt)
                .toList();
    }

    private int compareMigrationVersions(List<Integer> left, List<Integer> right) {
        int maxLength = Math.max(left.size(), right.size());
        for (int index = 0; index < maxLength; index++) {
            int leftPart = index < left.size() ? left.get(index) : 0;
            int rightPart = index < right.size() ? right.get(index) : 0;
            if (leftPart != rightPart) {
                return Integer.compare(leftPart, rightPart);
            }
        }
        return 0;
    }
}
