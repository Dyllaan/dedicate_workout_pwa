package com.louisfiges.workout;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("V27 exercise catalog repair")
class V27ExerciseCatalogRepairReplayIT extends BaseIntegrationTest {

    private static final UUID USER_LOUIS = UUID.fromString("76a41d5f-5e98-41a8-8467-2cbf96d27efb");
    private static final UUID USER_ZANDER = UUID.fromString("a33e8658-4694-4990-b329-a19bec29e059");

    static {
        System.setProperty("JWT_PUBLIC_KEY_B64",
                "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAriJ6FdmOBbl2RMuY6B2ygASe85zHOMSIxFp/MD7Vay/GynTIIxxBVx+6Jun9UCFpwsR4MjVOCWAEUzPJNlHDmsW9fan7hJwlzGl9mypfMVs1TgOB168cj/cqFIuusTAe0BRbkVeUBo65o2HG/FIF8jR54etfo5oczqt6puiwV7hTirTBiqd6O/uQDNI9GjeK1zJeWE9O19rhWHBuj+OO9kb1D+eWRAtacW7SItNC0OLLSuxDDDUWaJDE5D+juMCANrIL5A2/v7GjTPTVeT6ZVZLlJcitQCa27ezxomh+6P+T6VbG6rFSRTiMn/vuBr7HaI4f0TmruZ4jTSnMxWnwrQIDAQAB");
        System.setProperty("JWT_ISSUER", "mdes-secure-voip-auth");
    }

    @BeforeEach
    void prepareSchema() throws Exception {
        prepareSchemaThroughMigrationVersion(26);
        seedLookupTables();
        seedCatalogRows();
        seedDefinitionRows();
    }

    @Test
    @DisplayName("repairs missing catalog rows and remaps the obvious null definitions")
    void repairsMissingCatalogRowsAndRemapsTheObviousNullDefinitions() throws Exception {
        applyMigration("db/migration/V27__repair_exercise_catalog_mappings.sql");

        assertThat(queryInt("""
                SELECT COUNT(*)
                FROM exercise_info
                WHERE LOWER(name) = LOWER('Face Pull')
                """)).isEqualTo(1);
        assertThat(queryInt("""
                SELECT COUNT(*)
                FROM exercise_info
                WHERE LOWER(name) = LOWER('Situp')
                """)).isEqualTo(1);

        assertMappedDefinition("Face Pull", null, "Face Pull", "No", "CATALOG");
        assertMappedDefinition("Situp", null, "Situp", "No", "CATALOG");
        assertMappedDefinition("Overhead Press", null, "Military Press:  Seated", "Yes", "CATALOG");
        assertMappedDefinition("Tricep Dip", "Machine", "Triceps Dip:  alternative machine", "Yes", "CATALOG");

        assertThat(queryInt("""
                SELECT COUNT(*)
                FROM exercise_info_muscles muscles
                JOIN exercise_info info ON info.id = muscles.exercise_info_id
                JOIN exercise_catalog_muscle_group group_lookup ON group_lookup.id = muscles.muscle_group_id
                WHERE LOWER(info.name) = LOWER('Face Pull')
                  AND muscles.muscle_role = 'TARGET'
                  AND LOWER(group_lookup.name) = LOWER('Rear Delt')
                """)).isEqualTo(1);
        assertThat(queryInt("""
                SELECT COUNT(*)
                FROM exercise_info_muscles muscles
                JOIN exercise_info info ON info.id = muscles.exercise_info_id
                JOIN exercise_catalog_muscle_group group_lookup ON group_lookup.id = muscles.muscle_group_id
                WHERE LOWER(info.name) = LOWER('Face Pull')
                  AND muscles.muscle_role = 'SECONDARY'
                  AND LOWER(group_lookup.name) IN (LOWER('Trapezius'), LOWER('Rhomboids'))
                """)).isEqualTo(2);
        assertThat(queryInt("""
                SELECT COUNT(*)
                FROM exercise_info_muscles muscles
                JOIN exercise_info info ON info.id = muscles.exercise_info_id
                JOIN exercise_catalog_muscle_group group_lookup ON group_lookup.id = muscles.muscle_group_id
                WHERE LOWER(info.name) = LOWER('Situp')
                  AND muscles.muscle_role = 'TARGET'
                  AND LOWER(group_lookup.name) = LOWER('Abs')
                """)).isEqualTo(1);
        assertThat(queryInt("""
                SELECT COUNT(*)
                FROM exercise_info_muscles muscles
                JOIN exercise_info info ON info.id = muscles.exercise_info_id
                JOIN exercise_catalog_muscle_group group_lookup ON group_lookup.id = muscles.muscle_group_id
                WHERE LOWER(info.name) = LOWER('Situp')
                  AND muscles.muscle_role = 'SECONDARY'
                  AND LOWER(group_lookup.name) = LOWER('Obliques')
                """)).isEqualTo(1);

        assertThat(queryInt("""
                SELECT COUNT(*)
                FROM exercise_definition_secondary_muscles sem
                JOIN exercise_definitions ed ON ed.id = sem.exercise_definition_id
                WHERE LOWER(ed.exercise_name) IN (LOWER('Face Pull'), LOWER('Situp'), LOWER('Overhead Press'), LOWER('Tricep Dip'))
                """)).isEqualTo(0);
    }

    private void seedLookupTables() {
        jdbcTemplate.update("INSERT INTO exercise_catalog_equipment (id, name) VALUES (?, ?)", 1L, "Cable");
        jdbcTemplate.update("INSERT INTO exercise_catalog_equipment (id, name) VALUES (?, ?)", 2L, "Body Weight");
        jdbcTemplate.update("INSERT INTO exercise_catalog_equipment (id, name) VALUES (?, ?)", 3L, "Barbell");
        jdbcTemplate.update("INSERT INTO exercise_catalog_equipment (id, name) VALUES (?, ?)", 4L, "Lever (selectorized)");

        jdbcTemplate.update("INSERT INTO exercise_catalog_utility (id, name) VALUES (?, ?)", 1L, "Basic");
        jdbcTemplate.update("INSERT INTO exercise_catalog_utility (id, name) VALUES (?, ?)", 2L, "Basic or Auxiliary");

        jdbcTemplate.update("INSERT INTO exercise_catalog_mechanics (id, name) VALUES (?, ?)", 1L, "Compound");
        jdbcTemplate.update("INSERT INTO exercise_catalog_mechanics (id, name) VALUES (?, ?)", 2L, "Isolated");

        jdbcTemplate.update("INSERT INTO exercise_catalog_force (id, name) VALUES (?, ?)", 1L, "Pull");
        jdbcTemplate.update("INSERT INTO exercise_catalog_force (id, name) VALUES (?, ?)", 2L, "Push");

        jdbcTemplate.update("INSERT INTO exercise_catalog_difficulty (level) VALUES (?)", 2);
        jdbcTemplate.update("INSERT INTO exercise_catalog_difficulty (level) VALUES (?)", 3);

        jdbcTemplate.update("INSERT INTO exercise_catalog_muscle_group (id, name) VALUES (?, ?)", 1L, "Rear Delt");
        jdbcTemplate.update("INSERT INTO exercise_catalog_muscle_group (id, name) VALUES (?, ?)", 2L, "Trapezius");
        jdbcTemplate.update("INSERT INTO exercise_catalog_muscle_group (id, name) VALUES (?, ?)", 3L, "Rhomboids");
        jdbcTemplate.update("INSERT INTO exercise_catalog_muscle_group (id, name) VALUES (?, ?)", 4L, "Abs");
        jdbcTemplate.update("INSERT INTO exercise_catalog_muscle_group (id, name) VALUES (?, ?)", 5L, "Obliques");
        jdbcTemplate.update("INSERT INTO exercise_catalog_muscle_group (id, name) VALUES (?, ?)", 6L, "Anterior Deltoid");
        jdbcTemplate.update("INSERT INTO exercise_catalog_muscle_group (id, name) VALUES (?, ?)", 7L, "Triceps Brachii");
        jdbcTemplate.update("INSERT INTO exercise_catalog_muscle_group (id, name) VALUES (?, ?)", 8L, "Rear Deltoid");
    }

    private void seedCatalogRows() {
        jdbcTemplate.update("""
                INSERT INTO exercise_info (
                    id, name, equipment_id, variation, utility_id, mechanics_id,
                    force_id, difficulty_id, main_muscle_id, parent_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                1001L, "Military Press:  Seated", 3L, "Yes", 1L, 1L, 2L, 3, 6L, null);

        jdbcTemplate.update("""
                INSERT INTO exercise_info (
                    id, name, equipment_id, variation, utility_id, mechanics_id,
                    force_id, difficulty_id, main_muscle_id, parent_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                1002L, "Triceps Dip:  alternative machine", 4L, "Yes", 1L, 1L, 2L, 3, 7L, null);
    }

    private void seedDefinitionRows() {
        jdbcTemplate.update("""
                INSERT INTO exercise_definitions (
                    id, user_id, exercise_name, variant, normalized_exercise_name, normalized_variant,
                    exercise_info_id, mapping_source, primary_muscle, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                UUID.fromString("00000000-0000-0000-0000-000000000111"),
                USER_LOUIS,
                "Face Pull",
                null,
                "face pull",
                "",
                null,
                "MANUAL",
                "traps");
        jdbcTemplate.update("""
                INSERT INTO exercise_definition_secondary_muscles (exercise_definition_id, muscle)
                VALUES (?, ?)
                """,
                UUID.fromString("00000000-0000-0000-0000-000000000111"),
                "biceps");

        jdbcTemplate.update("""
                INSERT INTO exercise_definitions (
                    id, user_id, exercise_name, variant, normalized_exercise_name, normalized_variant,
                    exercise_info_id, mapping_source, primary_muscle, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                UUID.fromString("00000000-0000-0000-0000-000000000222"),
                USER_ZANDER,
                "Situp",
                null,
                "situp",
                "",
                null,
                "AUTO",
                null);

        jdbcTemplate.update("""
                INSERT INTO exercise_definitions (
                    id, user_id, exercise_name, variant, normalized_exercise_name, normalized_variant,
                    exercise_info_id, mapping_source, primary_muscle, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                UUID.fromString("00000000-0000-0000-0000-000000000333"),
                USER_ZANDER,
                "Overhead Press",
                null,
                "overhead press",
                "",
                null,
                "AUTO",
                null);

        jdbcTemplate.update("""
                INSERT INTO exercise_definitions (
                    id, user_id, exercise_name, variant, normalized_exercise_name, normalized_variant,
                    exercise_info_id, mapping_source, primary_muscle, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                UUID.fromString("00000000-0000-0000-0000-000000000444"),
                USER_ZANDER,
                "Tricep Dip",
                "Machine",
                "tricep dip",
                "machine",
                null,
                "AUTO",
                null);
    }

    private void applyMigration(String classpathLocation) throws Exception {
        try (var connection = jdbcTemplate.getDataSource().getConnection()) {
            ScriptUtils.executeSqlScript(
                    connection,
                    new EncodedResource(new ClassPathResource(classpathLocation), StandardCharsets.UTF_8)
            );
        }
    }

    private void assertMappedDefinition(String exerciseName, String variant, String mappedCatalogName, String mappedCatalogVariation, String mappingSource) {
        List<Object> params = variant == null
                ? List.of(exerciseName)
                : List.of(exerciseName, variant);
        String sql = variant == null
                ? """
                SELECT ed.mapping_source, ei.name, ei.variation, ed.exercise_info_id
                FROM exercise_definitions ed
                JOIN exercise_info ei ON ei.id = ed.exercise_info_id
                WHERE LOWER(ed.exercise_name) = LOWER(?)
                """
                : """
                SELECT ed.mapping_source, ei.name, ei.variation, ed.exercise_info_id
                FROM exercise_definitions ed
                JOIN exercise_info ei ON ei.id = ed.exercise_info_id
                WHERE LOWER(ed.exercise_name) = LOWER(?)
                  AND LOWER(COALESCE(ed.variant, '')) = LOWER(?)
                """;

        var row = jdbcTemplate.queryForMap(sql, params.toArray());
        assertThat(row.get("mapping_source")).isEqualTo(mappingSource);
        assertThat(row.get("name")).isEqualTo(mappedCatalogName);
        assertThat(row.get("variation")).isEqualTo(mappedCatalogVariation);
        assertThat(row.get("exercise_info_id")).isNotNull();
    }

    private int queryInt(String sql) {
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class);
        assertThat(count).isNotNull();
        return count;
    }
}
