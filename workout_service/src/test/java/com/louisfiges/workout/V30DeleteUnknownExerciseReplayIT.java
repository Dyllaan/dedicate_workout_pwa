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

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

@Testcontainers(disabledWithoutDocker = true)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("V30 delete unknown exercise")
class V30DeleteUnknownExerciseReplayIT {

    private static final DockerImageName POSTGRES_IMAGE = DockerImageName.parse("postgres:17");
    private static final Path DUMP_DIR = Path.of("..", "dump").toAbsolutePath().normalize();
    private static final Path AUTH_DUMP = DUMP_DIR.resolve("auth_backup_20260615_003004.dump");
    private static final Path WORKOUT_DUMP = DUMP_DIR.resolve("workout_backup_full_20260615_003331.dump");
    private static final String POSTGRES_USER = "postgres";
    private static final String POSTGRES_PASSWORD = "postgres";
    private static final String UNKNOWN_EXERCISE_ID = "034e7e87-2135-49d0-8d90-534e5420a47e";
    private static final String UNKNOWN_WORKOUT_ENTRY_ID = "74d62ac2-f5bd-46ec-aede-6e12f4ad2556";

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(POSTGRES_IMAGE)
            .withDatabaseName("postgres")
            .withUsername(POSTGRES_USER)
            .withPassword(POSTGRES_PASSWORD);

    @Test
    void replayDeletesTheUnknownExerciseAndItsSets() throws Exception {
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

        try (Connection workout = databaseConnection("workout")) {
            ensureExtensionExists(workout, "pgcrypto");

            applyMigration(workout, "db/migration/V26__normalize_exercise_catalog.sql");
            applyMigration(workout, "db/migration/V27__repair_exercise_catalog_mappings.sql");
            applyMigration(workout, "db/migration/V28__repair_zander_remaining_catalog_mappings.sql");
            applyMigration(workout, "db/migration/V29__repair_remaining_exercise_aliases_and_rear_delt_fly.sql");
            applyMigration(workout, "db/migration/V30__delete_unknown_exercise.sql");
            applyMigration(workout, "db/migration/V30_1__align_daos_with_entities.sql");
            applyMigration(workout, "db/migration/V31__repair_face_pull_definition_matching.sql");
            applyMigration(workout, "db/migration/V32__collapse_face_pull_aliases.sql");

            assertThat(queryInt(workout, """
                    SELECT COUNT(*)
                    FROM exercise_definitions
                    WHERE id = '%s'
                    """.formatted(UNKNOWN_EXERCISE_ID))).isEqualTo(0);
            assertThat(queryInt(workout, """
                    SELECT COUNT(*)
                    FROM exercise_entries
                    WHERE exercise_definition_id = '%s'
                    """.formatted(UNKNOWN_EXERCISE_ID))).isEqualTo(0);
            assertThat(queryInt(workout, """
                    SELECT COUNT(*)
                    FROM set_entries se
                    JOIN exercise_entries ee ON ee.id = se.exercise_entry_id
                    WHERE ee.exercise_definition_id = '%s'
                    """.formatted(UNKNOWN_EXERCISE_ID))).isEqualTo(0);
            assertThat(queryInt(workout, """
                    SELECT COUNT(*)
                    FROM exercise_entries
                    WHERE workout_entry_id = '%s'
                    """.formatted(UNKNOWN_WORKOUT_ENTRY_ID))).isEqualTo(4);
            assertThat(queryInt(workout, """
                    SELECT COUNT(*)
                    FROM exercise_configs
                    """)).isGreaterThan(0);
            assertThat(queryInt(workout, """
                    SELECT COUNT(*)
                    FROM split_workout_assignments
                    """)).isGreaterThan(0);
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

    private int queryInt(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery(sql)) {
            assertThat(resultSet.next()).isTrue();
            return resultSet.getInt(1);
        }
    }
}
