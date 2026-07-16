package com.louisfiges.workout.service.workout;

import com.louisfiges.workout.BaseIntegrationTest;
import com.louisfiges.workout.analysis.types.PrimaryBenchmark;
import com.louisfiges.workout.analysis.types.ProgressionMode;
import com.louisfiges.workout.dto.request.ExerciseConfigRequest;
import com.louisfiges.workout.dto.request.ExerciseDefinitionRequest;
import com.louisfiges.workout.dto.request.WorkoutTemplateRequest;
import com.louisfiges.workout.dto.responses.WorkoutTemplateDTO;
import com.louisfiges.workout.dto.responses.ExerciseDefinitionDTO;
import com.louisfiges.workout.heatmap.MappingSource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("WorkoutTemplate persistence")
class WorkoutTemplatePersistenceIT extends BaseIntegrationTest {

    static {
        System.setProperty("JWT_PUBLIC_KEY_B64",
                "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAriJ6FdmOBbl2RMuY6B2ygASe85zHOMSIxFp/MD7Vay/GynTIIxxBVx+6Jun9UCFpwsR4MjVOCWAEUzPJNlHDmsW9fan7hJwlzGl9mypfMVs1TgOB168cj/cqFIuusTAe0BRbkVeUBo65o2HG/FIF8jR54etfo5oczqt6puiwV7hTirTBiqd6O/uQDNI9GjeK1zJeWE9O19rhWHBuj+OO9kb1D+eWRAtacW7SItNC0OLLSuxDDDUWaJDE5D+juMCANrIL5A2/v7GjTPTVeT6ZVZLlJcitQCa27ezxomh+6P+T6VbG6rFSRTiMn/vuBr7HaI4f0TmruZ4jTSnMxWnwrQIDAQAB");
        System.setProperty("JWT_ISSUER", "mdes-secure-voip-auth");
    }

    @Autowired
    private WorkoutTemplateService workoutTemplateService;

    @Autowired
    private ExerciseDefinitionService exerciseDefinitionService;

    @Test
    @DisplayName("persists workout_template_id for newly created exercise configs")
    void persistsWorkoutTemplateIdWhenCreatingWorkoutTemplate() {
        UUID userId = UUID.randomUUID();
        UUID firstDefinitionId = createExerciseDefinition(userId, "Low Row", "Cable");
        UUID secondDefinitionId = createExerciseDefinition(userId, "Incline Press", "Barbell");

        WorkoutTemplateRequest request = new WorkoutTemplateRequest(
                "Upper Day",
                "Upper",
                List.of(
                        exerciseConfigRequest(firstDefinitionId, "Low Row", "Cable", 3, 8, 90, false),
                        exerciseConfigRequest(secondDefinitionId, "Incline Press", "Barbell", 4, 10, 75, true)
                )
        );

        WorkoutTemplateDTO created = workoutTemplateService.create(request, userId);
        UUID templateId = created.id();

        List<Integer> exerciseOrders = jdbcTemplate.queryForList(
                "SELECT exercise_order FROM exercise_configs WHERE workout_template_id = ? ORDER BY exercise_order",
                Integer.class,
                templateId
        );

        assertThat(exerciseOrders).containsExactly(0, 1);
        assertThat(created.exercises()).extracting(exercise -> exercise.exerciseDefinition().id())
                .containsExactly(firstDefinitionId, secondDefinitionId);

        WorkoutTemplateDTO reloaded = workoutTemplateService.getById(templateId, userId);
        assertThat(reloaded.exercises()).extracting(exercise -> exercise.exerciseDefinition().id())
                .containsExactly(firstDefinitionId, secondDefinitionId);
    }

    @Test
    @DisplayName("persists workout_template_id again when updating workout template exercises")
    void persistsWorkoutTemplateIdWhenUpdatingWorkoutTemplate() {
        UUID userId = UUID.randomUUID();
        UUID firstDefinitionId = createExerciseDefinition(userId, "Low Row", "Cable");
        UUID secondDefinitionId = createExerciseDefinition(userId, "Incline Press", "Barbell");

        WorkoutTemplateRequest createRequest = new WorkoutTemplateRequest(
                "Upper Day",
                "Upper",
                List.of(
                        exerciseConfigRequest(firstDefinitionId, "Low Row", "Cable", 3, 8, 90, false),
                        exerciseConfigRequest(secondDefinitionId, "Incline Press", "Barbell", 4, 10, 75, true)
                )
        );

        UUID templateId = workoutTemplateService.create(createRequest, userId).id();

        WorkoutTemplateRequest updateRequest = new WorkoutTemplateRequest(
                "Upper Day Updated",
                "Upper",
                List.of(
                        exerciseConfigRequest(secondDefinitionId, "Incline Press", "Barbell", 5, 12, 60, true),
                        exerciseConfigRequest(firstDefinitionId, "Low Row", "Cable", 4, 10, 75, false)
                )
        );

        WorkoutTemplateDTO updated = workoutTemplateService.update(templateId, updateRequest, userId);

        List<Integer> exerciseOrders = jdbcTemplate.queryForList(
                "SELECT exercise_order FROM exercise_configs WHERE workout_template_id = ? ORDER BY exercise_order",
                Integer.class,
                templateId
        );

        assertThat(exerciseOrders).containsExactly(0, 1);
        assertThat(updated.exercises()).extracting(exercise -> exercise.exerciseDefinition().id())
                .containsExactly(secondDefinitionId, firstDefinitionId);

        WorkoutTemplateDTO reloaded = workoutTemplateService.getById(templateId, userId);
        assertThat(reloaded.exercises()).extracting(exercise -> exercise.exerciseDefinition().id())
                .containsExactly(secondDefinitionId, firstDefinitionId);
    }

    private UUID createExerciseDefinition(UUID userId, String exerciseName, String variant) {
        ExerciseDefinitionDTO created = exerciseDefinitionService.upsert(
                userId,
                new ExerciseDefinitionRequest(
                        null,
                        exerciseName,
                        variant,
                        null,
                        MappingSource.AUTO,
                        null,
                        List.of()
                )
        );
        return created.id();
    }

    private ExerciseConfigRequest exerciseConfigRequest(
            UUID exerciseDefinitionId,
            String exerciseName,
            String variant,
            int goalSets,
            Integer goalReps,
            Integer targetRestSeconds,
            Boolean focus
    ) {
        return new ExerciseConfigRequest(
                null,
                exerciseDefinitionId,
                exerciseName,
                goalSets,
                variant,
                goalReps,
                null,
                ProgressionMode.REPS_FIRST,
                PrimaryBenchmark.TOP_SET,
                targetRestSeconds,
                focus
        );
    }
}
