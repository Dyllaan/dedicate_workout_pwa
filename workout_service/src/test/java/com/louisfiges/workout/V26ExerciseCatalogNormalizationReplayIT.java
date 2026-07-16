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

import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("V26 exercise catalog normalization")
class V26ExerciseCatalogNormalizationReplayIT {

    private static final DockerImageName POSTGRES_IMAGE = DockerImageName.parse("postgres:17");
    private static final String POSTGRES_USER = "postgres";
    private static final String POSTGRES_PASSWORD = "postgres";

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(POSTGRES_IMAGE)
            .withDatabaseName("postgres")
            .withUsername(POSTGRES_USER)
            .withPassword(POSTGRES_PASSWORD);

    @Test
    void backfillsLookupTablesAndMuscleRolesFromLegacyExerciseInfoRows() throws Exception {
        try (Connection connection = connection()) {
            prepareLegacySchema(connection);
            seedLegacyRows(connection);
            applyMigration(connection, "db/migration/V26__normalize_exercise_catalog.sql");

            assertThat(queryInt(connection, "SELECT COUNT(*) FROM exercise_catalog_equipment")).isEqualTo(1);
            assertThat(queryInt(connection, "SELECT COUNT(*) FROM exercise_catalog_utility")).isEqualTo(1);
            assertThat(queryInt(connection, "SELECT COUNT(*) FROM exercise_catalog_mechanics")).isEqualTo(1);
            assertThat(queryInt(connection, "SELECT COUNT(*) FROM exercise_catalog_force")).isEqualTo(1);
            assertThat(queryInt(connection, "SELECT COUNT(*) FROM exercise_catalog_difficulty")).isEqualTo(2);
            assertThat(queryInt(connection, "SELECT COUNT(*) FROM exercise_catalog_muscle_group")).isEqualTo(8);

            assertThat(queryInt(connection, "SELECT COUNT(*) FROM exercise_info_muscles")).isEqualTo(13);
            assertThat(queryInt(connection, """
                    SELECT COUNT(*)
                    FROM exercise_info_muscles
                    WHERE exercise_info_id = 1
                      AND muscle_role = 'SECONDARY'
                    """)).isEqualTo(2);
            assertThat(queryInt(connection, """
                    SELECT COUNT(*)
                    FROM exercise_info_muscles
                    WHERE exercise_info_id = 2
                    AND muscle_role = 'SECONDARY'
                    """)).isEqualTo(2);
            assertThat(queryInt(connection, """
                    SELECT COUNT(*)
                    FROM exercise_catalog_muscle_group
                    WHERE LOWER(name) = 'quadratus lumborum'
                    """)).isEqualTo(1);
            assertThat(queryInt(connection, """
                    SELECT COUNT(*)
                    FROM exercise_info_muscles muscles
                    JOIN exercise_catalog_muscle_group muscle_group
                        ON muscle_group.id = muscles.muscle_group_id
                    WHERE muscles.muscle_role = 'SECONDARY'
                      AND LOWER(muscle_group.name) = 'quadratus lumborum'
                    """)).isEqualTo(2);

            assertThat(queryString(connection, """
                    SELECT e.name
                    FROM exercise_info i
                    JOIN exercise_catalog_equipment e ON e.id = i.equipment_id
                    WHERE i.id = 1
                    """)).isEqualTo("Cable");

            assertThat(queryString(connection, """
                    SELECT m.name
                    FROM exercise_info i
                    JOIN exercise_catalog_muscle_group m ON m.id = i.main_muscle_id
                    WHERE i.id = 2
                    """)).isEqualTo("Chest");

            assertThat(queryNullableLong(connection, "SELECT parent_id FROM exercise_info WHERE id = 2")).isEqualTo(1L);
        }
    }

    private Connection connection() throws Exception {
        String url = postgres.getJdbcUrl().replace("/postgres", "/postgres");
        return DriverManager.getConnection(url, postgres.getUsername(), postgres.getPassword());
    }

    private void prepareLegacySchema(Connection connection) throws Exception {
        try (Statement statement = connection.createStatement()) {
            statement.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto");
            statement.execute("""
                    CREATE TABLE exercise_info (
                        id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        equipment VARCHAR(255),
                        variation VARCHAR(255),
                        utility VARCHAR(255),
                        mechanics VARCHAR(255),
                        force VARCHAR(255),
                        preparation TEXT,
                        execution TEXT,
                        target_muscles VARCHAR(255),
                        synergist_muscles VARCHAR(255),
                        stabilizer_muscles VARCHAR(255),
                        antagonist_muscles VARCHAR(255),
                        dynamic_stabilizer_muscles VARCHAR(255),
                        main_muscle VARCHAR(255),
                        difficulty INTEGER,
                        secondary_muscles VARCHAR(255),
                        parent_id BIGINT
                    )
                    """);
        }
    }

    private void seedLegacyRows(Connection connection) throws Exception {
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO exercise_info (
                        id, name, equipment, variation, utility, mechanics, force,
                        preparation, execution, target_muscles, synergist_muscles,
                        stabilizer_muscles, antagonist_muscles, dynamic_stabilizer_muscles,
                        main_muscle, difficulty, secondary_muscles, parent_id
                    ) VALUES (
                        1,
                        'High Row',
                        'Cable',
                        NULL,
                        'Basic',
                        'Compound',
                        'Pull',
                        'Prepare row',
                        'Execute row',
                        'Lats, Back',
                        'Forearms',
                        'Rhomboids',
                        NULL,
                        NULL,
                        'Back',
                        2,
                        'Lats, Quadratus Lumborum',
                        NULL
                    )
                    """);
            statement.executeUpdate("""
                    INSERT INTO exercise_info (
                        id, name, equipment, variation, utility, mechanics, force,
                        preparation, execution, target_muscles, synergist_muscles,
                        stabilizer_muscles, antagonist_muscles, dynamic_stabilizer_muscles,
                        main_muscle, difficulty, secondary_muscles, parent_id
                    ) VALUES (
                        2,
                        'High Row: Wide Grip',
                        'Cable',
                        'Yes',
                        'Basic',
                        'Compound',
                        'Pull',
                        'Prepare row 2',
                        'Execute row 2',
                        'Back, Lats',
                        'Forearms',
                        'Traps',
                        NULL,
                        'Delts',
                        'Chest',
                        4,
                        'Lats, Quadratus lumborum',
                        99
                    )
                    """);
        }
    }

    private void applyMigration(Connection connection, String classpathLocation) throws Exception {
        ScriptUtils.executeSqlScript(
                connection,
                new EncodedResource(new ClassPathResource(classpathLocation), StandardCharsets.UTF_8)
        );
    }

    private int queryInt(Connection connection, String sql) throws Exception {
        try (Statement statement = connection.createStatement();
             var resultSet = statement.executeQuery(sql)) {
            assertThat(resultSet.next()).isTrue();
            return resultSet.getInt(1);
        }
    }

    private long queryNullableLong(Connection connection, String sql) throws Exception {
        try (Statement statement = connection.createStatement();
             var resultSet = statement.executeQuery(sql)) {
            assertThat(resultSet.next()).isTrue();
            return resultSet.getLong(1);
        }
    }

    private String queryString(Connection connection, String sql) throws Exception {
        try (Statement statement = connection.createStatement();
             var resultSet = statement.executeQuery(sql)) {
            assertThat(resultSet.next()).isTrue();
            return resultSet.getString(1);
        }
    }
}
