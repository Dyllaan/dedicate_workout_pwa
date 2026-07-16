package com.louisfiges.workout;

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
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

@Testcontainers(disabledWithoutDocker = true)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class V19UnifiedExerciseDefinitionsReplayIT {

    private static final DockerImageName POSTGRES_IMAGE = DockerImageName.parse("postgres:17");
    private static final Path DUMP_DIR = Path.of("..", "dump").toAbsolutePath().normalize();
    private static final Path AUTH_DUMP = DUMP_DIR.resolve("auth_backup_20260605_233101.dump");
    private static final Path WORKOUT_DUMP = DUMP_DIR.resolve("workout_backup_20260605_233101.dump");
    private static final String POSTGRES_USER = "postgres";
    private static final String POSTGRES_PASSWORD = "postgres";

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(POSTGRES_IMAGE)
            .withDatabaseName("postgres")
            .withUsername(POSTGRES_USER)
            .withPassword(POSTGRES_PASSWORD);

    @Test
    void replayKeepsZanderAndLouisConsistent() throws Exception {
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

            Map<String, UUID> userIdsByUsername = loadTargetUsers(auth);
            Set<UUID> targetUserIds = new LinkedHashSet<>(userIdsByUsername.values());

            ReplayState before = snapshot(workout, targetUserIds);
            applyMigration(workout, "db/migration/V19__unified_exercise_definitions.sql");
            ReplayState after = snapshot(workout, targetUserIds);

            assertThat(after.exerciseInfoRows).as("exercise_info unchanged").isEqualTo(before.exerciseInfoRows);
            assertThat(after.workoutTemplatesRows).as("workout_templates unchanged").isEqualTo(before.workoutTemplatesRows);
            assertThat(after.workoutEntriesRows).as("workout_entries unchanged").isEqualTo(before.workoutEntriesRows);
            assertThat(after.mappedExercisesRows).as("mapped_exercises unchanged").isEqualTo(before.mappedExercisesRows);
            assertThat(after.mappedExerciseSecondaryRows).as("mapped_exercise_secondary_muscles unchanged")
                    .isEqualTo(before.mappedExerciseSecondaryRows);

            assertThat(after.workoutExercisesProjection).as("workout_exercises source columns unchanged")
                    .isEqualTo(before.workoutExercisesProjection);
            assertThat(after.exerciseEntriesProjection).as("exercise_entries source columns unchanged")
                    .isEqualTo(before.exerciseEntriesProjection);

            List<Map<String, String>> workoutExerciseRuntimeRows = queryRows(workout, """
                    SELECT wt.user_id,
                           we.workout_template_id,
                           we.exercise_order,
                           we.exercise_name,
                           we.goal_sets,
                           we.variant,
                           we.goal_reps,
                           we.exercise_info_id,
                           we.lift_role,
                           we.progression_mode,
                           we.microload_kg,
                           we.include_in_competition_lift_trend,
                           we.primary_benchmark,
                           we.target_rest_seconds,
                           we.exercise_config_id,
                           we.exercise_definition_id
                    FROM workout_exercises we
                    JOIN workout_templates wt ON wt.id = we.workout_template_id
                    WHERE wt.user_id IN (%s)
                    ORDER BY wt.user_id, we.workout_template_id, we.exercise_order
                    """.formatted(placeholders(targetUserIds.size())), new ArrayList<>(targetUserIds));
            assertThat(workoutExerciseRuntimeRows)
                    .as("workout_exercises gained required runtime columns")
                    .allSatisfy(row -> {
                        assertThat(row.get("exercise_config_id")).isNotNull();
                        assertThat(row.get("exercise_definition_id")).isNotNull();
                    });

            List<Map<String, String>> exerciseEntryRuntimeRows = queryRows(workout, """
                    SELECT wt.user_id,
                           ee.id,
                           ee.exercise_name,
                           ee.variant,
                           ee.workout_entry_id,
                           ee.exercise_order,
                           ee.goal_sets,
                           ee.exercise_info_id,
                           ee.exercise_definition_id,
                           ee.logged_exercise_name,
                           ee.logged_variant
                    FROM exercise_entries ee
                    JOIN workout_entries entry ON entry.id = ee.workout_entry_id
                    JOIN workout_templates wt ON wt.id = entry.workout_template_id
                    WHERE wt.user_id IN (%s)
                    ORDER BY ee.id
                    """.formatted(placeholders(targetUserIds.size())), new ArrayList<>(targetUserIds));
            assertThat(exerciseEntryRuntimeRows)
                    .as("exercise_entries gained required runtime columns")
                    .allSatisfy(row -> {
                        assertThat(row.get("exercise_definition_id")).isNotNull();
                        assertThat(row.get("logged_exercise_name")).isEqualTo(row.get("exercise_name"));
                        assertThat(row.get("logged_variant")).isEqualTo(row.get("variant"));
                    });

            List<Map<String, String>> actualDefinitions = queryRows(workout, """
                    SELECT user_id,
                           exercise_name,
                           variant,
                           normalized_exercise_name,
                           normalized_variant,
                           exercise_info_id,
                           mapping_source,
                           primary_muscle
                    FROM exercise_definitions
                    WHERE user_id IN (%s)
                    ORDER BY user_id, normalized_exercise_name, normalized_variant
                    """.formatted(placeholders(targetUserIds.size())), new ArrayList<>(targetUserIds));
            assertThat(actualDefinitions)
                    .as("exercise_definition identity keys")
                    .extracting(row -> definitionKey(row.get("user_id"), row.get("normalized_exercise_name"), row.get("normalized_variant")))
                    .containsExactlyInAnyOrderElementsOf(expectedDefinitionKeys(before));

            List<Map<String, String>> expectedSecondaryMuscles = expectedSecondaryMuscles(before);
            List<Map<String, String>> actualSecondaryMuscles = queryRows(workout, """
                    SELECT ed.user_id,
                           ed.normalized_exercise_name,
                           ed.normalized_variant,
                           sem.muscle
                    FROM exercise_definition_secondary_muscles sem
                    JOIN exercise_definitions ed ON ed.id = sem.exercise_definition_id
                    WHERE ed.user_id IN (%s)
                    ORDER BY ed.user_id, ed.normalized_exercise_name, ed.normalized_variant, sem.muscle
                    """.formatted(placeholders(targetUserIds.size())), new ArrayList<>(targetUserIds));
            assertThat(actualSecondaryMuscles).as("exercise_definition_secondary_muscles exact match")
                    .containsExactlyInAnyOrderElementsOf(expectedSecondaryMuscles);

            Map<DefinitionKey, String> actualDefinitionIds = loadDefinitionIds(workout, targetUserIds);
            assertExerciseRowFksMatchDefinitions(workoutExerciseRuntimeRows, before.workoutExerciseSourceRows, actualDefinitionIds);
            assertExerciseRowFksMatchDefinitions(exerciseEntryRuntimeRows, before.exerciseEntrySourceRows, actualDefinitionIds);
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
        List<String> usernames = List.of("louis", "zander");
        List<?> params = usernames;
        List<Map<String, String>> rows = queryRows(connection, """
                SELECT username, id
                FROM public.users
                WHERE lower(username) IN (%s)
                ORDER BY username
                """.formatted(placeholders(usernames.size())), params);

        assertThat(rows).extracting(row -> row.get("username")).containsExactly("louis", "zander");

        Map<String, UUID> result = new LinkedHashMap<>();
        for (Map<String, String> row : rows) {
            result.put(row.get("username"), UUID.fromString(row.get("id")));
        }
        return result;
    }

    private ReplayState snapshot(Connection connection, Set<UUID> targetUserIds) throws SQLException {
        List<?> params = new ArrayList<>(targetUserIds);

        return new ReplayState(
                queryRows(connection, """
                        SELECT *
                        FROM exercise_info
                        ORDER BY id
                        """),
                queryRows(connection, """
                        SELECT *
                        FROM workout_templates
                        WHERE user_id IN (%s)
                        ORDER BY id
                        """.formatted(placeholders(targetUserIds.size())), params),
                queryRows(connection, """
                        SELECT *
                        FROM workout_entries
                        WHERE user_id IN (%s)
                        ORDER BY id
                        """.formatted(placeholders(targetUserIds.size())), params),
                queryRows(connection, """
                        SELECT wt.user_id,
                               we.workout_template_id,
                               we.exercise_order,
                               we.exercise_name,
                               we.goal_sets,
                               we.variant,
                               we.goal_reps,
                               we.exercise_info_id,
                               we.lift_role,
                               we.progression_mode,
                               we.microload_kg,
                               we.include_in_competition_lift_trend,
                               we.primary_benchmark,
                               we.target_rest_seconds
                        FROM workout_exercises we
                        JOIN workout_templates wt ON wt.id = we.workout_template_id
                        WHERE wt.user_id IN (%s)
                        ORDER BY wt.user_id, we.workout_template_id, we.exercise_order
                        """.formatted(placeholders(targetUserIds.size())), params),
                queryRows(connection, """
                        SELECT we.id,
                               we.exercise_name,
                               we.variant,
                               we.workout_entry_id,
                               we.exercise_order,
                               we.goal_sets,
                               we.exercise_info_id
                        FROM exercise_entries we
                        JOIN workout_entries entry ON entry.id = we.workout_entry_id
                        JOIN workout_templates wt ON wt.id = entry.workout_template_id
                        WHERE wt.user_id IN (%s)
                        ORDER BY we.id
                        """.formatted(placeholders(targetUserIds.size())), params),
                queryRows(connection, """
                        SELECT me.*
                        FROM mapped_exercises me
                        WHERE me.user_id IN (%s)
                        ORDER BY me.user_id, me.normalized_exercise_name, me.normalized_variant
                        """.formatted(placeholders(targetUserIds.size())), params),
                queryRows(connection, """
                        SELECT me.user_id,
                               sem.mapped_exercise_id,
                               sem.muscle
                        FROM mapped_exercise_secondary_muscles sem
                        JOIN mapped_exercises me ON me.id = sem.mapped_exercise_id
                        WHERE me.user_id IN (%s)
                        ORDER BY me.user_id, sem.mapped_exercise_id, sem.muscle
                        """.formatted(placeholders(targetUserIds.size())), params),
                buildWorkoutExerciseSourceRows(connection, targetUserIds),
                buildExerciseEntrySourceRows(connection, targetUserIds)
        );
    }

    private List<SourceDefinitionRow> buildWorkoutExerciseSourceRows(Connection connection, Set<UUID> targetUserIds) throws SQLException {
        List<?> params = new ArrayList<>(targetUserIds);
        return query(connection, """
                SELECT wt.user_id,
                       we.exercise_name,
                       we.variant,
                       we.exercise_info_id,
                       ei.name AS exercise_info_name,
                       ei.variation AS exercise_info_variation
                FROM workout_exercises we
                JOIN workout_templates wt ON wt.id = we.workout_template_id
                LEFT JOIN exercise_info ei ON ei.id = we.exercise_info_id
                WHERE wt.user_id IN (%s)
                ORDER BY wt.user_id, we.workout_template_id, we.exercise_order
                """.formatted(placeholders(targetUserIds.size())), params, resultSet -> new SourceDefinitionRow(
                SourceType.WORKOUT_EXERCISE,
                UUID.fromString(resultSet.getString("user_id")),
                resultSet.getString("exercise_name"),
                resultSet.getString("variant"),
                resultSet.getObject("exercise_info_id", Long.class),
                resultSet.getString("exercise_info_name"),
                resultSet.getString("exercise_info_variation"),
                null,
                null,
                null,
                null,
                null,
                null,
                List.of()
        ));
    }

    private List<SourceDefinitionRow> buildExerciseEntrySourceRows(Connection connection, Set<UUID> targetUserIds) throws SQLException {
        List<?> params = new ArrayList<>(targetUserIds);
        return query(connection, """
                SELECT wt.user_id,
                       ee.exercise_name,
                       ee.variant,
                       COALESCE(ei.id, ee.exercise_info_id, template_we.exercise_info_id) AS exercise_info_id,
                       ei.name AS exercise_info_name,
                       ei.variation AS exercise_info_variation,
                       template_we.exercise_name AS template_exercise_name,
                       template_we.variant AS template_exercise_variant,
                       template_ei.name AS template_exercise_info_name,
                       template_ei.variation AS template_exercise_info_variation
                FROM exercise_entries ee
                JOIN workout_entries wentry ON wentry.id = ee.workout_entry_id
                JOIN workout_templates wt ON wt.id = wentry.workout_template_id
                LEFT JOIN workout_exercises template_we
                       ON template_we.workout_template_id = wt.id
                      AND template_we.exercise_order = ee.exercise_order
                LEFT JOIN exercise_info ei ON ei.id = ee.exercise_info_id
                LEFT JOIN exercise_info template_ei ON template_ei.id = template_we.exercise_info_id
                WHERE wt.user_id IN (%s)
                ORDER BY ee.id
                """.formatted(placeholders(targetUserIds.size())), params, resultSet -> new SourceDefinitionRow(
                SourceType.EXERCISE_ENTRY,
                UUID.fromString(resultSet.getString("user_id")),
                resultSet.getString("exercise_name"),
                resultSet.getString("variant"),
                resultSet.getObject("exercise_info_id", Long.class),
                resultSet.getString("exercise_info_name"),
                resultSet.getString("exercise_info_variation"),
                resultSet.getString("template_exercise_name"),
                resultSet.getString("template_exercise_variant"),
                resultSet.getString("template_exercise_info_name"),
                resultSet.getString("template_exercise_info_variation"),
                null,
                null,
                List.of()
        ));
    }

    private Map<DefinitionKey, String> loadDefinitionIds(Connection connection, Set<UUID> targetUserIds) throws SQLException {
        List<?> params = new ArrayList<>(targetUserIds);
        List<Map<String, String>> rows = queryRows(connection, """
                SELECT id,
                       user_id,
                       normalized_exercise_name,
                       normalized_variant
                FROM exercise_definitions
                WHERE user_id IN (%s)
                ORDER BY user_id, normalized_exercise_name, normalized_variant
                """.formatted(placeholders(targetUserIds.size())), params);

        Map<DefinitionKey, String> result = new LinkedHashMap<>();
        for (Map<String, String> row : rows) {
            result.put(new DefinitionKey(
                    UUID.fromString(row.get("user_id")),
                    row.get("normalized_exercise_name"),
                    row.get("normalized_variant")
            ), row.get("id"));
        }
        return result;
    }

    private List<String> expectedDefinitionKeys(ReplayState before) {
        Map<DefinitionKey, DefinitionAccumulator> expected = new LinkedHashMap<>();
        for (SourceDefinitionRow row : before.workoutExerciseSourceRows) {
            mergeExpected(expected, row);
        }
        for (SourceDefinitionRow row : before.exerciseEntrySourceRows) {
            mergeExpected(expected, row);
        }
        for (SourceDefinitionRow row : buildMappedExerciseSourceRows(before)) {
            mergeExpected(expected, row);
        }

        return expected.values().stream()
                .map(definition -> definitionKey(
                        definition.userId.toString(),
                        definition.normalizedExerciseName,
                        definition.normalizedVariant
                ))
                .toList();
    }

    private List<Map<String, String>> expectedSecondaryMuscles(ReplayState before) {
        Map<DefinitionKey, DefinitionAccumulator> expected = buildExpectedDefinitionMap(before);
        List<Map<String, String>> rows = new ArrayList<>();
        for (DefinitionAccumulator definition : expected.values()) {
            for (String muscle : definition.secondaryMuscles) {
                LinkedHashMap<String, String> row = new LinkedHashMap<>();
                row.put("user_id", definition.userId.toString());
                row.put("normalized_exercise_name", definition.normalizedExerciseName);
                row.put("normalized_variant", definition.normalizedVariant);
                row.put("muscle", muscle);
                rows.add(row);
            }
        }

        rows.sort((left, right) -> definitionKey(
                left.get("user_id"),
                left.get("normalized_exercise_name"),
                left.get("normalized_variant"),
                left.get("muscle")
        ).compareTo(definitionKey(
                right.get("user_id"),
                right.get("normalized_exercise_name"),
                right.get("normalized_variant"),
                right.get("muscle")
        )));
        return rows;
    }

    private Map<DefinitionKey, DefinitionAccumulator> buildExpectedDefinitionMap(ReplayState before) {
        Map<DefinitionKey, DefinitionAccumulator> expected = new LinkedHashMap<>();
        for (SourceDefinitionRow row : before.workoutExerciseSourceRows) {
            mergeExpected(expected, row);
        }
        for (SourceDefinitionRow row : before.exerciseEntrySourceRows) {
            mergeExpected(expected, row);
        }
        for (SourceDefinitionRow row : buildMappedExerciseSourceRows(before)) {
            mergeExpected(expected, row);
        }
        return expected;
    }

    private List<SourceDefinitionRow> buildMappedExerciseSourceRows(ReplayState before) {
        Map<UUID, Set<String>> secondaryMusclesByMappedExerciseId = before.mappedExerciseSecondaryRows.stream()
                .collect(Collectors.groupingBy(
                        row -> UUID.fromString(row.get("mapped_exercise_id")),
                        Collectors.mapping(row -> row.get("muscle"), Collectors.toCollection(LinkedHashSet::new))
                ));

        List<SourceDefinitionRow> rows = new ArrayList<>();
        for (Map<String, String> row : before.mappedExercisesRows) {
            rows.add(new SourceDefinitionRow(
                    SourceType.MAPPED_EXERCISE,
                    UUID.fromString(row.get("user_id")),
                    row.get("exercise_name"),
                    row.get("variant"),
                    row.get("exercise_info_id") == null ? null : Long.valueOf(row.get("exercise_info_id")),
                    row.get("exercise_name"),
                    row.get("variant"),
                    null,
                    null,
                    null,
                    null,
                    row.get("mapping_source"),
                    row.get("primary_muscle"),
                    List.copyOf(secondaryMusclesByMappedExerciseId.getOrDefault(UUID.fromString(row.get("id")), Set.of()))
            ));
        }
        return rows;
    }

    private void mergeExpected(Map<DefinitionKey, DefinitionAccumulator> expected, SourceDefinitionRow row) {
        DefinitionKey key = keyFor(row);
        DefinitionAccumulator accumulator = expected.get(key);
        if (accumulator == null) {
            accumulator = canonicalAccumulator(row);
            expected.put(key, accumulator);
            return;
        }

        if (row.sourceType == SourceType.MAPPED_EXERCISE) {
            accumulator.mappingSource = row.mappingSource;
            accumulator.primaryMuscle = trimToNull(row.primaryMuscle);
            accumulator.secondaryMuscles.clear();
            accumulator.secondaryMuscles.addAll(row.secondaryMuscles);
            if (accumulator.exerciseInfoId == null) {
                accumulator.exerciseInfoId = exerciseInfoIdFor(row);
            }
        }
    }

    private DefinitionAccumulator canonicalAccumulator(SourceDefinitionRow row) {
        String exerciseName = canonicalExerciseName(row);
        String variant = canonicalVariant(row);
        String normalizedExerciseName = normalize(exerciseName);
        String normalizedVariant = normalize(variant);
        return new DefinitionAccumulator(
                row.userId,
                exerciseName,
                variant,
                normalizedExerciseName,
                normalizedVariant,
                exerciseInfoIdFor(row),
                row.sourceType == SourceType.MAPPED_EXERCISE && trimToNull(row.mappingSource) != null
                        ? row.mappingSource
                        : (exerciseInfoIdFor(row) == null ? "AUTO" : "CATALOG"),
                trimToNull(row.primaryMuscle),
                new LinkedHashSet<>(row.secondaryMuscles)
        );
    }

    private DefinitionKey keyFor(SourceDefinitionRow row) {
        return new DefinitionKey(
                row.userId,
                normalize(canonicalExerciseName(row)),
                normalize(canonicalVariant(row))
        );
    }

    private Long exerciseInfoIdFor(SourceDefinitionRow row) {
        return row.exerciseInfoId;
    }

    private String canonicalExerciseName(SourceDefinitionRow row) {
        String exerciseInfoName = trimToNull(row.exerciseInfoName);
        if (exerciseInfoName != null) {
            return exerciseInfoName;
        }
        String exerciseName = trimToNull(row.exerciseName);
        if (exerciseName != null) {
            return exerciseName;
        }
        String templateExerciseName = trimToNull(row.templateExerciseName);
        if (templateExerciseName != null) {
            return templateExerciseName;
        }
        return "Unknown exercise";
    }

    private String canonicalVariant(SourceDefinitionRow row) {
        String exerciseInfoVariation = trimToNull(row.exerciseInfoVariation);
        if (exerciseInfoVariation != null) {
            return exerciseInfoVariation;
        }
        String exerciseVariant = trimToNull(row.variant);
        if (exerciseVariant != null) {
            return exerciseVariant;
        }
        String templateExerciseVariant = trimToNull(row.templateExerciseVariant);
        if (templateExerciseVariant != null) {
            return templateExerciseVariant;
        }
        return null;
    }

    private void assertExerciseRowFksMatchDefinitions(
            List<Map<String, String>> runtimeRows,
            List<SourceDefinitionRow> sourceRows,
            Map<DefinitionKey, String> actualDefinitionIds
    ) {
        for (int i = 0; i < sourceRows.size(); i++) {
            SourceDefinitionRow sourceRow = sourceRows.get(i);
            Map<String, String> runtimeRow = runtimeRows.get(i);
            DefinitionKey key = keyFor(sourceRow);
            assertThat(runtimeRow.get("exercise_definition_id"))
                    .as("definition id for %s", key)
                    .isEqualTo(actualDefinitionIds.get(key));
        }
    }

    private String definitionKey(String userId, String normalizedExerciseName, String normalizedVariant) {
        return userId + "|" + normalizedExerciseName + "|" + normalizedVariant;
    }

    private String definitionKey(String userId, String normalizedExerciseName, String normalizedVariant, String muscle) {
        return userId + "|" + normalizedExerciseName + "|" + normalizedVariant + "|" + muscle;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String placeholders(int count) {
        return String.join(",", Collections.nCopies(count, "?"));
    }

    private List<Map<String, String>> queryRows(Connection connection, String sql) throws SQLException {
        return queryRows(connection, sql, List.of());
    }

    private List<Map<String, String>> queryRows(Connection connection, String sql, List<?> parameters) throws SQLException {
        return query(connection, sql, parameters, resultSet -> {
            ResultSetMetaData metaData = resultSet.getMetaData();
            LinkedHashMap<String, String> row = new LinkedHashMap<>();
            for (int i = 1; i <= metaData.getColumnCount(); i++) {
                String columnName = metaData.getColumnLabel(i);
                Object value = resultSet.getObject(i);
                row.put(columnName, value == null ? null : value.toString());
            }
            return row;
        });
    }

    private <T> List<T> query(Connection connection, String sql, List<?> parameters, SqlRowMapper<T> mapper) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            for (int i = 0; i < parameters.size(); i++) {
                statement.setObject(i + 1, parameters.get(i));
            }

            try (ResultSet resultSet = statement.executeQuery()) {
                List<T> rows = new ArrayList<>();
                while (resultSet.next()) {
                    rows.add(mapper.map(resultSet));
                }
                return rows;
            }
        }
    }

    private record DefinitionKey(UUID userId, String normalizedExerciseName, String normalizedVariant) {
    }

    private enum SourceType {
        WORKOUT_EXERCISE,
        EXERCISE_ENTRY,
        MAPPED_EXERCISE
    }

    private record SourceDefinitionRow(
            SourceType sourceType,
            UUID userId,
            String exerciseName,
            String variant,
            Long exerciseInfoId,
            String exerciseInfoName,
            String exerciseInfoVariation,
            String templateExerciseName,
            String templateExerciseVariant,
            String templateExerciseInfoName,
            String templateExerciseInfoVariation,
            String mappingSource,
            String primaryMuscle,
            List<String> secondaryMuscles
    ) {
    }

    private static final class DefinitionAccumulator {
        private final UUID userId;
        private String exerciseName;
        private String variant;
        private final String normalizedExerciseName;
        private final String normalizedVariant;
        private Long exerciseInfoId;
        private String mappingSource;
        private String primaryMuscle;
        private final LinkedHashSet<String> secondaryMuscles;

        private DefinitionAccumulator(
                UUID userId,
                String exerciseName,
                String variant,
                String normalizedExerciseName,
                String normalizedVariant,
                Long exerciseInfoId,
                String mappingSource,
                String primaryMuscle,
                LinkedHashSet<String> secondaryMuscles
        ) {
            this.userId = userId;
            this.exerciseName = exerciseName;
            this.variant = variant;
            this.normalizedExerciseName = normalizedExerciseName;
            this.normalizedVariant = normalizedVariant;
            this.exerciseInfoId = exerciseInfoId;
            this.mappingSource = mappingSource;
            this.primaryMuscle = primaryMuscle;
            this.secondaryMuscles = secondaryMuscles;
        }

    }

    private record ReplayState(
            List<Map<String, String>> exerciseInfoRows,
            List<Map<String, String>> workoutTemplatesRows,
            List<Map<String, String>> workoutEntriesRows,
            List<Map<String, String>> workoutExercisesProjection,
            List<Map<String, String>> exerciseEntriesProjection,
            List<Map<String, String>> mappedExercisesRows,
            List<Map<String, String>> mappedExerciseSecondaryRows,
            List<SourceDefinitionRow> workoutExerciseSourceRows,
            List<SourceDefinitionRow> exerciseEntrySourceRows
    ) {
    }

    private interface SqlRowMapper<T> {
        T map(ResultSet resultSet) throws SQLException;
    }
}
