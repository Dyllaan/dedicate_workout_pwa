package com.louisfiges.workout;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.MountableFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

@Testcontainers(disabledWithoutDocker = true)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("V29 exercise catalog follow-up repair")
class V29ExerciseCatalogRepairFollowUpReplayIT {

    private static final DockerImageName POSTGRES_IMAGE = DockerImageName.parse("postgres:17");
    private static final Path DUMP_DIR = Path.of("..", "dump").toAbsolutePath().normalize();
    private static final Path AUTH_DUMP = DUMP_DIR.resolve("auth_backup_20260615_003004.dump");
    private static final Path WORKOUT_DUMP = DUMP_DIR.resolve("workout_backup_full_20260615_003331.dump");
    private static final String POSTGRES_USER = "postgres";
    private static final String POSTGRES_PASSWORD = "postgres";
    private static final UUID USER_LOUIS = UUID.fromString("76a41d5f-5e98-41a8-8467-2cbf96d27efb");
    private static final UUID USER_ZANDER = UUID.fromString("a33e8658-4694-4990-b329-a19bec29e059");

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(POSTGRES_IMAGE)
            .withDatabaseName("postgres")
            .withUsername(POSTGRES_USER)
            .withPassword(POSTGRES_PASSWORD);

    @Test
    void replayRepairsTheRemainingAliasNoiseAndRearDeltFlyFamily() throws Exception {
        assumeTrue(Files.isRegularFile(AUTH_DUMP), "Missing auth dump: " + AUTH_DUMP);
        assumeTrue(Files.isRegularFile(WORKOUT_DUMP), "Missing workout dump: " + WORKOUT_DUMP);

        try (Connection admin = adminConnection()) {
            ensureRoleExists(admin, "auth_user");
            ensureRoleExists(admin, "workout_user");
            ensureDatabaseExists(admin, "auth");
            ensureDatabaseExists(admin, "workout");
        }

        restoreDump("auth", AUTH_DUMP);
        restoreDump("workout", WORKOUT_DUMP);

        try (Connection auth = databaseConnection("auth");
             Connection workout = databaseConnection("workout")) {
            ensureExtensionExists(workout, "pgcrypto");

            Map<String, UUID> users = loadTargetUsers(auth);
            assertThat(users).containsEntry("louis", USER_LOUIS);
            assertThat(users).containsEntry("zander", USER_ZANDER);

            applyMigration(workout, "db/migration/V26__normalize_exercise_catalog.sql");
            applyMigration(workout, "db/migration/V27__repair_exercise_catalog_mappings.sql");
            applyMigration(workout, "db/migration/V28__repair_zander_remaining_catalog_mappings.sql");
            applyMigration(workout, "db/migration/V29__repair_remaining_exercise_aliases_and_rear_delt_fly.sql");

            assertThat(queryInt(workout, """
                    SELECT COUNT(*)
                    FROM exercise_definitions
                    WHERE user_id = '76a41d5f-5e98-41a8-8467-2cbf96d27efb'
                      AND exercise_info_id IS NULL
                    """)).isEqualTo(0);
            assertThat(queryInt(workout, """
                    SELECT COUNT(*)
                    FROM exercise_definitions
                    WHERE user_id = 'a33e8658-4694-4990-b329-a19bec29e059'
                      AND exercise_info_id IS NULL
                    """)).isEqualTo(1);

            assertMappedDefinition(workout, USER_LOUIS, "Barbell Shrug", "Calf raise machine",
                    "Shrug", "No", "Lever (plate loaded)", "MANUAL");
            assertMappedDefinition(workout, USER_LOUIS, "Bicep Curls", "Dumbbell",
                    "Curl", "No", "Dumbbell", "CATALOG");
            assertMappedDefinition(workout, USER_LOUIS, "Dip Machine", "Close Grip",
                    "Triceps Dip:  alternative machine", "Yes", "Lever (selectorized)", "CATALOG");
            assertMappedDefinition(workout, USER_LOUIS, "Dumbbell Curl", "Dumbbell",
                    "Curl", "No", "Dumbbell", "CATALOG");
            assertMappedDefinition(workout, USER_LOUIS, "Hyperextension", "Calf raise machine",
                    "Hyperextension", "No", "Weighted", "CATALOG");
            assertMappedDefinition(workout, USER_LOUIS, "Pec Fly", "Close Grip",
                    "Flies:  Pec Deck Fly", "Yes", "Lever (selectorized)", "CATALOG");
            assertMappedDefinition(workout, USER_LOUIS, "Pullover", "Calf raise machine",
                    "Pullover", "No", "Lever (selectorized)", "CATALOG");
            assertMappedDefinition(workout, USER_LOUIS, "Pushdown", "Dumbbell",
                    "Pushdown", "No", "Cable", "CATALOG");
            assertMappedDefinition(workout, USER_LOUIS, "Rear Delt Fly", "",
                    "Rear Delt Fly", "No", "Cable", "CATALOG");
            assertMappedDefinition(workout, USER_LOUIS, "Rear Delt Fly", "Machine",
                    "Rear Delt Fly", "No", "Cable", "CATALOG");
            assertMappedDefinition(workout, USER_LOUIS, "Rear delt fly", "Single arm",
                    "Rear Delt Fly", "No", "Cable", "CATALOG");
            assertMappedDefinition(workout, USER_LOUIS, "Rear delt fly", "Calf raise machine",
                    "Shrug", "No", "Lever (plate loaded)", "MANUAL");
            assertMappedDefinition(workout, USER_LOUIS, "Skullcrusher", "Dumbbell",
                    "Lying Triceps Extension:  Skull Crusher", "Yes", "Barbell", "CATALOG");
            assertMappedDefinition(workout, USER_LOUIS, "Tricep Pushdown", "Dumbbell",
                    "Pushdown", "No", "Cable", "CATALOG");
            assertMappedDefinition(workout, USER_LOUIS, "Underhand Pull-ups", "Dumbbell",
                    "Pull-up", "No", "Body Weight", "CATALOG");
            assertMappedDefinition(workout, USER_LOUIS, "Viking Press", "Dumbbell",
                    "Military Press:  Seated", "Yes", "Barbell", "CATALOG");

            assertMappedDefinition(workout, USER_ZANDER, "Facepulls", "",
                    "Face Pull", "No", "Cable", "CATALOG");
            assertMappedDefinition(workout, USER_ZANDER, "Lat raise", "",
                    "Lateral Raise", "No", "Cable", "CATALOG");
            assertMappedDefinition(workout, USER_ZANDER, "Lat raise", "Line",
                    "Lateral Raise", "No", "Cable", "CATALOG");
            assertMappedDefinition(workout, USER_ZANDER, "Lat raises", "",
                    "Lateral Raise", "No", "Cable", "CATALOG");
            assertMappedDefinition(workout, USER_ZANDER, "Low row", "Machine",
                    "Low Row", "", "Cable", "CATALOG");
            assertMappedDefinition(workout, USER_ZANDER, "Overhead triceps", "",
                    "Triceps Extension", "No", "Cable", "CATALOG");
            assertMappedDefinition(workout, USER_ZANDER, "Pull up", "",
                    "Pull-up", "No", "Body Weight", "CATALOG");
            assertMappedDefinition(workout, USER_ZANDER, "Tricep dip", "",
                    "Triceps Dip", "No", "Body Weight", "CATALOG");
            assertThat(queryInt(workout, """
                    SELECT COUNT(*)
                    FROM exercise_definitions
                    WHERE user_id = 'a33e8658-4694-4990-b329-a19bec29e059'
                      AND exercise_info_id IS NULL
                      AND LOWER(exercise_name) = LOWER('Unknown exercise')
                    """)).isEqualTo(1);

            assertThat(queryInt(workout, """
                    SELECT COUNT(*)
                    FROM exercise_info
                    WHERE LOWER(name) = LOWER('Rear Delt Fly')
                      AND COALESCE(LOWER(variation), '') = LOWER('No')
                      AND equipment_id = (
                          SELECT id FROM exercise_catalog_equipment WHERE LOWER(name) = LOWER('Cable')
                      )
                    """)).isEqualTo(1);

            assertThat(queryInt(workout, """
                    SELECT COUNT(DISTINCT exercise_info_id)
                    FROM exercise_definitions
                    WHERE user_id = '76a41d5f-5e98-41a8-8467-2cbf96d27efb'
                      AND LOWER(exercise_name) IN (LOWER('Rear Delt Fly'), LOWER('Rear delt fly'))
                      AND (
                          LOWER(COALESCE(variant, '')) = ''
                          OR LOWER(variant) = LOWER('Machine')
                          OR LOWER(variant) = LOWER('Single arm')
                      )
                    """)).isEqualTo(1);
            assertThat(queryInt(workout, """
                    SELECT COUNT(*)
                    FROM exercise_definitions
                    WHERE user_id = '76a41d5f-5e98-41a8-8467-2cbf96d27efb'
                      AND LOWER(exercise_name) IN (LOWER('Rear Delt Fly'), LOWER('Rear delt fly'))
                      AND (
                          LOWER(COALESCE(variant, '')) = ''
                          OR LOWER(variant) = LOWER('Machine')
                          OR LOWER(variant) = LOWER('Single arm')
                      )
                      AND exercise_info_id = (
                          SELECT id
                          FROM exercise_info
                          WHERE LOWER(name) = LOWER('Rear Delt Fly')
                            AND COALESCE(LOWER(variation), '') = LOWER('No')
                            AND equipment_id = (
                                SELECT id FROM exercise_catalog_equipment WHERE LOWER(name) = LOWER('Cable')
                            )
                      )
                    """)).isEqualTo(3);
        }
    }

    private Connection adminConnection() throws SQLException {
        return DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
    }

    private Connection databaseConnection(String databaseName) throws SQLException {
        String url = postgres.getJdbcUrl().replace("/postgres", "/" + databaseName);
        return DriverManager.getConnection(url, postgres.getUsername(), postgres.getPassword());
    }

    private void ensureRoleExists(Connection connection, String roleName) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("SELECT 1 FROM pg_roles WHERE rolname = ?")) {
            statement.setString(1, roleName);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (resultSet.next()) {
                    return;
                }
            }
        }

        try (Statement statement = connection.createStatement()) {
            statement.execute("CREATE ROLE " + roleName + " LOGIN");
        }
    }

    private void ensureDatabaseExists(Connection connection, String databaseName) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("SELECT 1 FROM pg_database WHERE datname = ?")) {
            statement.setString(1, databaseName);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (resultSet.next()) {
                    return;
                }
            }
        }

        try (Statement statement = connection.createStatement()) {
            statement.execute("CREATE DATABASE " + databaseName);
        }
    }

    private void ensureExtensionExists(Connection connection, String extensionName) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("CREATE EXTENSION IF NOT EXISTS " + extensionName);
        }
    }

    private void restoreDump(String databaseName, Path dumpFile) throws IOException, InterruptedException {
        String containerPath = "/tmp/" + dumpFile.getFileName();
        postgres.copyFileToContainer(MountableFile.forHostPath(dumpFile), containerPath);

        var result = postgres.execInContainer(
                "pg_restore",
                "-U",
                POSTGRES_USER,
                "--no-owner",
                "-d",
                databaseName,
                containerPath
        );
        assertThat(result.getExitCode())
                .as("pg_restore stderr: %s", result.getStderr())
                .isZero();
    }

    private void applyMigration(Connection connection, String classpathLocation) throws Exception {
        ScriptUtils.executeSqlScript(
                connection,
                new EncodedResource(new ClassPathResource(classpathLocation), StandardCharsets.UTF_8)
        );
    }

    private Map<String, UUID> loadTargetUsers(Connection connection) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("""
                SELECT username, id
                FROM users
                WHERE username IN (?, ?)
                ORDER BY username
                """)) {
            statement.setString(1, "louis");
            statement.setString(2, "zander");
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.LinkedHashMap<String, UUID> users = new java.util.LinkedHashMap<>();
                while (resultSet.next()) {
                    users.put(resultSet.getString("username"), (UUID) resultSet.getObject("id"));
                }
                return users;
            }
        }
    }

    private int queryInt(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery(sql)) {
            assertThat(resultSet.next()).isTrue();
            return resultSet.getInt(1);
        }
    }

    private void assertMappedDefinition(
            Connection connection,
            UUID userId,
            String exerciseName,
            String variant,
            String mappedCatalogName,
            String mappedCatalogVariation,
            String mappedEquipmentName,
            String mappingSource
    ) throws SQLException {
        String sql = variant == null || variant.isEmpty()
                ? """
                SELECT ed.mapping_source, ei.name AS catalog_name, COALESCE(ei.variation, '') AS catalog_variation, eq.name AS equipment_name, ed.exercise_info_id
                FROM exercise_definitions ed
                JOIN exercise_info ei ON ei.id = ed.exercise_info_id
                JOIN exercise_catalog_equipment eq ON eq.id = ei.equipment_id
                WHERE ed.user_id = ?
                  AND LOWER(ed.exercise_name) = LOWER(?)
                  AND COALESCE(LOWER(ed.variant), '') = ''
                """
                : """
                SELECT ed.mapping_source, ei.name AS catalog_name, COALESCE(ei.variation, '') AS catalog_variation, eq.name AS equipment_name, ed.exercise_info_id
                FROM exercise_definitions ed
                JOIN exercise_info ei ON ei.id = ed.exercise_info_id
                JOIN exercise_catalog_equipment eq ON eq.id = ei.equipment_id
                WHERE ed.user_id = ?
                  AND LOWER(ed.exercise_name) = LOWER(?)
                  AND LOWER(COALESCE(ed.variant, '')) = LOWER(?)
                """;

        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, userId);
            statement.setString(2, exerciseName);
            if (variant != null && !variant.isEmpty()) {
                statement.setString(3, variant);
            }
            try (ResultSet resultSet = statement.executeQuery()) {
                assertThat(resultSet.next()).isTrue();
                assertThat(resultSet.getString("mapping_source")).isEqualTo(mappingSource);
                assertThat(resultSet.getString("catalog_name")).isEqualTo(mappedCatalogName);
                assertThat(resultSet.getString("catalog_variation")).isEqualTo(mappedCatalogVariation);
                assertThat(resultSet.getString("equipment_name")).isEqualTo(mappedEquipmentName);
                assertThat(resultSet.getObject("exercise_info_id")).isNotNull();
            }
        }
    }
}
