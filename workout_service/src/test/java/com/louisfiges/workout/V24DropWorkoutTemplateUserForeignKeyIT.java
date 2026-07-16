package com.louisfiges.workout;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
@DisplayName("V24 drop workout template user foreign key migration")
class V24DropWorkoutTemplateUserForeignKeyIT {

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(DockerImageName.parse("postgres:17"))
            .withDatabaseName("workout")
            .withUsername("workout_user")
            .withPassword("workout_password");

    @Test
    @DisplayName("drops the legacy workout_templates user foreign key and allows auth-only user ids")
    void dropsTheLegacyWorkoutTemplateUserForeignKeyAndAllowsAuthOnlyUserIds() throws Exception {
        try (Connection connection = DriverManager.getConnection(
                postgres.getJdbcUrl(),
                postgres.getUsername(),
                postgres.getPassword()
        )) {
            createLegacySchema(connection);

            UUID userId = UUID.randomUUID();
            UUID templateId = UUID.randomUUID();

            assertThat(hasForeignKeyOnUserId(connection)).isTrue();

            executeMigration(connection);

            assertThat(hasForeignKeyOnUserId(connection)).isFalse();

            try (PreparedStatement statement = connection.prepareStatement(
                    "INSERT INTO workout_templates (id, name, user_id, category, created_at) VALUES (?, ?, ?, ?, ?)"
            )) {
                statement.setObject(1, templateId);
                statement.setString(2, "Push Day");
                statement.setObject(3, userId);
                statement.setString(4, "Strength");
                statement.setTimestamp(5, Timestamp.from(java.time.Instant.now()));
                int inserted = statement.executeUpdate();
                assertThat(inserted).isEqualTo(1);
            }
        }
    }

    private void createLegacySchema(Connection connection) throws Exception {
        try (Statement statement = connection.createStatement()) {
            statement.execute("""
                    CREATE TABLE users (
                        id UUID PRIMARY KEY,
                        username VARCHAR(255) NOT NULL UNIQUE
                    )
                    """);
            statement.execute("""
                    CREATE TABLE workout_templates (
                        id UUID PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        user_id UUID NOT NULL REFERENCES users(id),
                        category VARCHAR(255) NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                    )
                    """);
        }
    }

    private boolean hasForeignKeyOnUserId(Connection connection) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement("""
                SELECT COUNT(*)
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_catalog = kcu.constraint_catalog
                    AND tc.constraint_schema = kcu.constraint_schema
                    AND tc.constraint_name = kcu.constraint_name
                WHERE tc.table_name = 'workout_templates'
                    AND tc.constraint_type = 'FOREIGN KEY'
                    AND kcu.column_name = 'user_id'
                """)) {
            try (ResultSet resultSet = statement.executeQuery()) {
                if (!resultSet.next()) {
                    return false;
                }
                return resultSet.getInt(1) > 0;
            }
        }
    }

    private void executeMigration(Connection connection) throws Exception {
        String sql = new ClassPathResource("db/migration/V24__drop_workout_template_user_foreign_key.sql")
                .getContentAsString(StandardCharsets.UTF_8);

        try (Statement statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }
}
