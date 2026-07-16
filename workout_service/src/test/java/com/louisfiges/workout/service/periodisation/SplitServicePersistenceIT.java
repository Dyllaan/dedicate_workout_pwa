package com.louisfiges.workout.service.periodisation;

import com.louisfiges.workout.BaseIntegrationTest;
import com.louisfiges.workout.analysis.types.PrimaryBenchmark;
import com.louisfiges.workout.analysis.types.ProgressionMode;
import com.louisfiges.workout.dto.request.ExerciseConfigRequest;
import com.louisfiges.workout.dto.request.ExerciseDefinitionRequest;
import com.louisfiges.workout.dto.request.SplitRequest;
import com.louisfiges.workout.dto.request.WorkoutFrequencyRequest;
import com.louisfiges.workout.dto.request.WorkoutTemplateRequest;
import com.louisfiges.workout.dto.responses.ExerciseDefinitionDTO;
import com.louisfiges.workout.dto.responses.SplitDTO;
import com.louisfiges.workout.dto.responses.SplitWorkoutAssignmentDTO;
import com.louisfiges.workout.dto.responses.WorkoutTemplateDTO;
import com.louisfiges.workout.heatmap.MappingSource;
import com.louisfiges.workout.exception.exceptions.BadRequestException;
import com.louisfiges.workout.service.workout.ExerciseDefinitionService;
import com.louisfiges.workout.service.workout.WorkoutTemplateService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Split service persistence")
class SplitServicePersistenceIT extends BaseIntegrationTest {

    static {
        System.setProperty("JWT_PUBLIC_KEY_B64",
                "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAriJ6FdmOBbl2RMuY6B2ygASe85zHOMSIxFp/MD7Vay/GynTIIxxBVx+6Jun9UCFpwsR4MjVOCWAEUzPJNlHDmsW9fan7hJwlzGl9mypfMVs1TgOB168cj/cqFIuusTAe0BRbkVeUBo65o2HG/FIF8jR54etfo5oczqt6puiwV7hTirTBiqd6O/uQDNI9GjeK1zJeWE9O19rhWHBuj+OO9kb1D+eWRAtacW7SItNC0OLLSuxDDDUWaJDE5D+juMCANrIL5A2/v7GjTPTVeT6ZVZLlJcitQCa27ezxomh+6P+T6VbG6rFSRTiMn/vuBr7HaI4f0TmruZ4jTSnMxWnwrQIDAQAB");
        System.setProperty("JWT_ISSUER", "mdes-secure-voip-auth");
    }

    @Autowired
    private SplitService splitService;

    @Autowired
    private WorkoutTemplateService workoutTemplateService;

    @Autowired
    private ExerciseDefinitionService exerciseDefinitionService;

    @Test
    @DisplayName("updates an existing split without violating the split/workout uniqueness constraint")
    void updatesExistingSplitWithoutRecreatingDuplicateAssignments() {
        UUID userId = UUID.randomUUID();
        UUID pushDefinitionId = createExerciseDefinition(userId, "Bench Press", "Barbell");
        UUID pullDefinitionId = createExerciseDefinition(userId, "Row", "Cable");
        UUID pushTemplateId = createWorkoutTemplate(userId, "Push Day", "Push", pushDefinitionId);
        UUID pullTemplateId = createWorkoutTemplate(userId, "Pull Day", "Pull", pullDefinitionId);

        SplitDTO created = splitService.create(
                new SplitRequest(
                        "Upper Lower",
                        List.of(
                                new WorkoutFrequencyRequest(pushTemplateId, 2),
                                new WorkoutFrequencyRequest(pullTemplateId, 3)
                        )
                ),
                userId
        );

        SplitDTO updated = splitService.update(
                created.id(),
                new SplitRequest(
                        "Upper Lower v2",
                        List.of(
                                new WorkoutFrequencyRequest(pushTemplateId, 4),
                                new WorkoutFrequencyRequest(pullTemplateId, 1)
                        )
                ),
                userId
        );

        assertThat(updated.name()).isEqualTo("Upper Lower v2");
        assertThat(updated.workoutAssignments())
                .extracting(SplitWorkoutAssignmentDTO::workoutTemplateId)
                .containsExactly(pushTemplateId, pullTemplateId);
        assertThat(updated.workoutAssignments())
                .extracting(SplitWorkoutAssignmentDTO::sessionsPerWeek)
                .containsExactly(4, 1);
        assertThat(updated.workoutAssignments())
                .extracting(SplitWorkoutAssignmentDTO::workoutOrder)
                .containsExactly(0, 1);

        Integer assignmentCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM split_workout_assignments WHERE split_id = ?",
                Integer.class,
                created.id()
        );
        assertThat(assignmentCount).isEqualTo(2);
    }

    @Test
    @DisplayName("updates split workout frequencies in place for the overview editor")
    void updatesWorkoutFrequenciesInPlace() {
        UUID userId = UUID.randomUUID();
        UUID pushDefinitionId = createExerciseDefinition(userId, "Bench Press", "Barbell");
        UUID pullDefinitionId = createExerciseDefinition(userId, "Row", "Cable");
        UUID pushTemplateId = createWorkoutTemplate(userId, "Push Day", "Push", pushDefinitionId);
        UUID pullTemplateId = createWorkoutTemplate(userId, "Pull Day", "Pull", pullDefinitionId);

        SplitDTO created = splitService.create(
                new SplitRequest(
                        "Upper Lower",
                        List.of(
                                new WorkoutFrequencyRequest(pushTemplateId, 2),
                                new WorkoutFrequencyRequest(pullTemplateId, 3)
                        )
                ),
                userId
        );

        SplitDTO updated = splitService.updateWorkoutFrequencies(
                created.id(),
                List.of(
                        new WorkoutFrequencyRequest(pushTemplateId, 5),
                        new WorkoutFrequencyRequest(pullTemplateId, 1)
                ),
                userId
        );

        assertThat(updated.workoutAssignments())
                .extracting(SplitWorkoutAssignmentDTO::sessionsPerWeek)
                .containsExactly(5, 1);
        assertThat(updated.workoutAssignments())
                .extracting(SplitWorkoutAssignmentDTO::workoutTemplateId)
                .containsExactly(pushTemplateId, pullTemplateId);
    }

    @Test
    @DisplayName("rejects duplicate workout template ids before persisting a split update")
    void rejectsDuplicateWorkoutTemplateIdsInSplitUpdate() {
        UUID userId = UUID.randomUUID();
        UUID pushDefinitionId = createExerciseDefinition(userId, "Bench Press", "Barbell");
        UUID pushTemplateId = createWorkoutTemplate(userId, "Push Day", "Push", pushDefinitionId);
        UUID pullDefinitionId = createExerciseDefinition(userId, "Row", "Cable");
        UUID pullTemplateId = createWorkoutTemplate(userId, "Pull Day", "Pull", pullDefinitionId);

        SplitDTO created = splitService.create(
                new SplitRequest(
                        "Upper Lower",
                        List.of(
                                new WorkoutFrequencyRequest(pushTemplateId, 2),
                                new WorkoutFrequencyRequest(pullTemplateId, 3)
                        )
                ),
                userId
        );

        assertThatThrownBy(() -> splitService.update(
                created.id(),
                new SplitRequest(
                        "Upper Lower",
                        List.of(
                                new WorkoutFrequencyRequest(pushTemplateId, 4),
                                new WorkoutFrequencyRequest(pushTemplateId, 1)
                        )
                ),
                userId
        )).isInstanceOf(BadRequestException.class)
                .hasMessageContaining("duplicate workout template ids");
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

    private UUID createWorkoutTemplate(UUID userId, String name, String category, UUID definitionId) {
        WorkoutTemplateDTO created = workoutTemplateService.create(
                new WorkoutTemplateRequest(
                        name,
                        category,
                        List.of(
                                new ExerciseConfigRequest(
                                        null,
                                        definitionId,
                                        name,
                                        3,
                                        null,
                                        5,
                                        null,
                                        ProgressionMode.WEIGHT_FIRST,
                                        PrimaryBenchmark.WORKING_SETS,
                                        90,
                                        false
                                )
                        )
                ),
                userId
        );
        return created.id();
    }
}
