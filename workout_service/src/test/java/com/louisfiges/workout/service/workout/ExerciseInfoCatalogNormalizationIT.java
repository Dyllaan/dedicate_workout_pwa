package com.louisfiges.workout.service.workout;

import com.louisfiges.workout.BaseIntegrationTest;
import com.louisfiges.workout.dto.responses.heatmap.ExerciseInfoCatalogItemDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ExerciseInfoCatalog normalization")
class ExerciseInfoCatalogNormalizationIT extends BaseIntegrationTest {

    static {
        System.setProperty("JWT_PUBLIC_KEY_B64",
                "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAriJ6FdmOBbl2RMuY6B2ygASe85zHOMSIxFp/MD7Vay/GynTIIxxBVx+6Jun9UCFpwsR4MjVOCWAEUzPJNlHDmsW9fan7hJwlzGl9mypfMVs1TgOB168cj/cqFIuusTAe0BRbkVeUBo65o2HG/FIF8jR54etfo5oczqt6puiwV7hTirTBiqd6O/uQDNI9GjeK1zJeWE9O19rhWHBuj+OO9kb1D+eWRAtacW7SItNC0OLLSuxDDDUWaJDE5D+juMCANrIL5A2/v7GjTPTVeT6ZVZLlJcitQCa27ezxomh+6P+T6VbG6rFSRTiMn/vuBr7HaI4f0TmruZ4jTSnMxWnwrQIDAQAB");
        System.setProperty("JWT_ISSUER", "mdes-secure-voip-auth");
    }

    @Autowired
    private ExerciseInfoCatalogService exerciseInfoCatalogService;

    @BeforeEach
    void prepareSchema() throws Exception {
        prepareSchemaThroughMigrationVersion(26);
        seedNormalizedRows();
    }

    @Test
    @DisplayName("searches the normalized catalog and returns curated quick picks")
    void searchesNormalizedCatalogAndReturnsQuickPicks() {
        List<ExerciseInfoCatalogItemDTO> searchResults = exerciseInfoCatalogService.searchCatalog("bench", 10);
        List<ExerciseInfoCatalogItemDTO> quickPicks = exerciseInfoCatalogService.getQuickPicks(10);

        assertThat(searchResults).extracting(ExerciseInfoCatalogItemDTO::name)
                .containsExactly("Bench Press");
        assertThat(quickPicks).extracting(ExerciseInfoCatalogItemDTO::name)
                .containsExactly("Bench Press", "Squat");
    }

    private void seedNormalizedRows() {
        jdbcTemplate.update("INSERT INTO exercise_catalog_equipment (id, name) VALUES (?, ?)", 9001L, "Barbell");
        jdbcTemplate.update("INSERT INTO exercise_catalog_utility (id, name) VALUES (?, ?)", 9001L, "Basic");
        jdbcTemplate.update("INSERT INTO exercise_catalog_mechanics (id, name) VALUES (?, ?)", 9001L, "Compound");
        jdbcTemplate.update("INSERT INTO exercise_catalog_force (id, name) VALUES (?, ?)", 9001L, "Push");
        jdbcTemplate.update("INSERT INTO exercise_catalog_force (id, name) VALUES (?, ?)", 9002L, "Pull");
        jdbcTemplate.update("INSERT INTO exercise_catalog_difficulty (level) VALUES (?)", 3);
        jdbcTemplate.update("INSERT INTO exercise_catalog_difficulty (level) VALUES (?)", 4);
        jdbcTemplate.update("INSERT INTO exercise_catalog_muscle_group (id, name) VALUES (?, ?)", 9001L, "Chest");
        jdbcTemplate.update("INSERT INTO exercise_catalog_muscle_group (id, name) VALUES (?, ?)", 9002L, "Quads");

        insertExercise(9101L, "Bench Press", "Barbell", 9001L, 9001L, 9001L, 9001L, 9001L, 3);
        insertExercise(9102L, "Squat", "Barbell", 9001L, 9001L, 9001L, 9002L, 9002L, 4);
    }

    private void insertExercise(
            long id,
            String name,
            String variation,
            long equipmentId,
            long utilityId,
            long mechanicsId,
            long forceId,
            long mainMuscleId,
            int difficulty
    ) {
        jdbcTemplate.update(
                """
                INSERT INTO exercise_info (
                    id, name, variation, equipment_id, utility_id, mechanics_id, force_id,
                    difficulty_id, main_muscle_id, preparation, execution, parent_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                id,
                name,
                variation,
                equipmentId,
                utilityId,
                mechanicsId,
                forceId,
                difficulty,
                mainMuscleId,
                "Prep " + name,
                "Exec " + name,
                null
        );
    }
}
