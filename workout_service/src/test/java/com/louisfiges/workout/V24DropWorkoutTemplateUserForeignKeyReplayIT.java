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
import java.sql.ResultSet;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("V24 drop workout_templates.user_id foreign key")
class V24DropWorkoutTemplateUserForeignKeyReplayIT {

    private static final DockerImageName POSTGRES_IMAGE = DockerImageName.parse("postgres:17");
    private static final String POSTGRES_USER = "postgres";
    private static final String POSTGRES_PASSWORD = "postgres";

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(POSTGRES_IMAGE)
            .withDatabaseName("postgres")
            .withUsername(POSTGRES_USER)
            .withPassword(POSTGRES_PASSWORD);

    @Test
    void dropsTheUserForeignKeyFromWorkoutTemplates() throws Exception {
        try (Connection connection = connection()) {
            prepareLegacySchema(connection);
            applyMigration(connection, "db/migration/V24__drop_workout_template_user_foreign_key.sql");

            try (Statement statement = connection.createStatement();
                 ResultSet resultSet = statement.executeQuery("""
                         SELECT COUNT(*)
                         FROM information_schema.table_constraints
                         WHERE table_schema = current_schema()
                           AND table_name = 'workout_templates'
                           AND constraint_type = 'FOREIGN KEY'
                         """)) {
                assertThat(resultSet.next()).isTrue();
                assertThat(resultSet.getInt(1)).isZero();
            }
        }
    }

    private Connection connection() throws Exception {
        return DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
    }

    private void prepareLegacySchema(Connection connection) throws Exception {
        try (Statement statement = connection.createStatement()) {
            statement.execute("""
                    CREATE TABLE users (
                        id UUID PRIMARY KEY
                    )
                    """);
            statement.execute("""
                    CREATE TABLE workout_templates (
                        id UUID PRIMARY KEY,
                        user_id UUID NOT NULL REFERENCES users(id)
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
}
