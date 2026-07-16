package com.louisfiges.workout.service.workout;

import com.louisfiges.workout.BaseIntegrationTest;
import com.louisfiges.workout.dao.workout.ExerciseCatalogDifficulty;
import com.louisfiges.workout.dao.workout.ExerciseCatalogEquipment;
import com.louisfiges.workout.dao.workout.ExerciseCatalogForce;
import com.louisfiges.workout.dao.workout.ExerciseCatalogMechanics;
import com.louisfiges.workout.dao.workout.ExerciseCatalogMuscleGroup;
import com.louisfiges.workout.dao.workout.ExerciseCatalogUtility;
import com.louisfiges.workout.dao.workout.ExerciseInfo;
import com.louisfiges.workout.dao.workout.ExerciseInfoMuscle;
import com.louisfiges.workout.dao.workout.ExerciseInfoMuscleRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ExerciseInfo normalization persistence")
class ExerciseInfoNormalizationPersistenceIT extends BaseIntegrationTest {

    static {
        System.setProperty("JWT_PUBLIC_KEY_B64",
                "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAriJ6FdmOBbl2RMuY6B2ygASe85zHOMSIxFp/MD7Vay/GynTIIxxBVx+6Jun9UCFpwsR4MjVOCWAEUzPJNlHDmsW9fan7hJwlzGl9mypfMVs1TgOB168cj/cqFIuusTAe0BRbkVeUBo65o2HG/FIF8jR54etfo5oczqt6puiwV7hTirTBiqd6O/uQDNI9GjeK1zJeWE9O19rhWHBuj+OO9kb1D+eWRAtacW7SItNC0OLLSuxDDDUWaJDE5D+juMCANrIL5A2/v7GjTPTVeT6ZVZLlJcitQCa27ezxomh+6P+T6VbG6rFSRTiMn/vuBr7HaI4f0TmruZ4jTSnMxWnwrQIDAQAB");
        System.setProperty("JWT_ISSUER", "mdes-secure-voip-auth");
    }

    @Autowired
    private ExerciseInfoService exerciseInfoService;

    @BeforeEach
    void prepareSchema() throws Exception {
        prepareSchemaThroughMigrationVersion(26);
    }

    @Test
    @DisplayName("writes lookup rows and muscle roles into normalized tables")
    void writesLookupRowsAndMuscleRolesIntoNormalizedTables() {
        ExerciseInfo exercise = new ExerciseInfo();
        exercise.setName("Low Row");
        exercise.setVariation("Cable");
        exercise.setEquipment(new ExerciseCatalogEquipment("Cable"));
        exercise.setUtility(new ExerciseCatalogUtility("Basic"));
        exercise.setMechanics(new ExerciseCatalogMechanics("Compound"));
        exercise.setForce(new ExerciseCatalogForce("Pull"));
        exercise.setPreparation("Prepare row");
        exercise.setExecution("Execute row");
        exercise.setMainMuscle(new ExerciseCatalogMuscleGroup("Back"));
        exercise.setDifficulty(new ExerciseCatalogDifficulty(3));
        exercise.setMuscles(buildMuscles(exercise));

        ExerciseInfo saved = exerciseInfoService.save(exercise);

        assertThat(saved.getId()).isNotNull();
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM exercise_catalog_equipment", Integer.class)).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM exercise_catalog_utility", Integer.class)).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM exercise_catalog_mechanics", Integer.class)).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM exercise_catalog_force", Integer.class)).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM exercise_catalog_difficulty", Integer.class)).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM exercise_catalog_muscle_group", Integer.class)).isEqualTo(5);
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM exercise_info_muscles", Integer.class)).isEqualTo(5);

        Map<String, Object> stored = jdbcTemplate.queryForMap(
                "SELECT equipment_id, utility_id, mechanics_id, force_id, difficulty_id, main_muscle_id FROM exercise_info WHERE id = ?",
                saved.getId()
        );
        assertThat(stored.values()).allMatch(value -> value != null);
    }

    private Set<ExerciseInfoMuscle> buildMuscles(ExerciseInfo exercise) {
        Set<ExerciseInfoMuscle> muscles = new LinkedHashSet<>();
        muscles.add(new ExerciseInfoMuscle(exercise, ExerciseInfoMuscleRole.TARGET, new ExerciseCatalogMuscleGroup("Lats")));
        muscles.add(new ExerciseInfoMuscle(exercise, ExerciseInfoMuscleRole.TARGET, new ExerciseCatalogMuscleGroup("Back")));
        muscles.add(new ExerciseInfoMuscle(exercise, ExerciseInfoMuscleRole.SYNERGIST, new ExerciseCatalogMuscleGroup("Biceps")));
        muscles.add(new ExerciseInfoMuscle(exercise, ExerciseInfoMuscleRole.STABILIZER, new ExerciseCatalogMuscleGroup("Rhomboids")));
        muscles.add(new ExerciseInfoMuscle(exercise, ExerciseInfoMuscleRole.SECONDARY, new ExerciseCatalogMuscleGroup("Traps")));
        return muscles;
    }
}
