package com.louisfiges.workout.service.workout;

import com.louisfiges.workout.BaseIntegrationTest;
import com.louisfiges.workout.analysis.types.PrimaryBenchmark;
import com.louisfiges.workout.analysis.types.ProgressionMode;
import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.dto.request.ExerciseConfigRequest;
import com.louisfiges.workout.dto.request.ExerciseDefinitionRequest;
import com.louisfiges.workout.dto.request.WorkoutTemplateRequest;
import com.louisfiges.workout.dto.responses.ExerciseDefinitionDTO;
import com.louisfiges.workout.dto.responses.WorkoutTemplateDTO;
import com.louisfiges.workout.heatmap.MappingSource;
import com.louisfiges.workout.repository.ExerciseConfigRepository;
import com.louisfiges.workout.service.mapper.ExerciseConfigMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ExerciseConfig persistence")
class ExerciseConfigPersistenceIT extends BaseIntegrationTest {

    static {
        System.setProperty("JWT_PUBLIC_KEY_B64",
                "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAriJ6FdmOBbl2RMuY6B2ygASe85zHOMSIxFp/MD7Vay/GynTIIxxBVx+6Jun9UCFpwsR4MjVOCWAEUzPJNlHDmsW9fan7hJwlzGl9mypfMVs1TgOB168cj/cqFIuusTAe0BRbkVeUBo65o2HG/FIF8jR54etfo5oczqt6puiwV7hTirTBiqd6O/uQDNI9GjeK1zJeWE9O19rhWHBuj+OO9kb1D+eWRAtacW7SItNC0OLLSuxDDDUWaJDE5D+juMCANrIL5A2/v7GjTPTVeT6ZVZLlJcitQCa27ezxomh+6P+T6VbG6rFSRTiMn/vuBr7HaI4f0TmruZ4jTSnMxWnwrQIDAQAB");
        System.setProperty("JWT_ISSUER", "mdes-secure-voip-auth");
    }

    @Autowired
    private ExerciseConfigRepository exerciseConfigRepository;

    @Autowired
    private ExerciseConfigMapper exerciseConfigMapper;

    @Autowired
    private WorkoutTemplateService workoutTemplateService;

    @Autowired
    private ExerciseDefinitionService exerciseDefinitionService;

    @Test
    @DisplayName("resolves owned exercise configs and rejects other users")
    void resolvesOwnedExerciseConfigs() {
        UUID ownerUserId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        UUID exerciseDefinitionId = createExerciseDefinition(ownerUserId, "Low Row", "Cable");

        WorkoutTemplateDTO created = workoutTemplateService.create(
                new WorkoutTemplateRequest(
                        "Upper Day",
                        "Upper",
                        List.of(exerciseConfigRequest(exerciseDefinitionId))
                ),
                ownerUserId
        );

        UUID exerciseConfigId = created.exercises().get(0).exerciseConfigId();

        Optional<ExerciseConfig> owned = exerciseConfigRepository.findByExerciseConfigIdAndWorkoutTemplateUserId(
                exerciseConfigId,
                ownerUserId
        );
        Optional<ExerciseConfig> foreign = exerciseConfigRepository.findByExerciseConfigIdAndWorkoutTemplateUserId(
                exerciseConfigId,
                otherUserId
        );

        assertThat(owned).isPresent();
        assertThat(exerciseConfigMapper.toDTO(owned.get()).goalSets()).isEqualTo(3);
        assertThat(foreign).isEmpty();

        List<ExerciseConfig> ownedConfigs = exerciseConfigRepository.findAllByWorkoutTemplateIdAndWorkoutTemplateUserId(
                created.id(),
                ownerUserId
        );
        assertThat(ownedConfigs).hasSize(1);
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

    private ExerciseConfigRequest exerciseConfigRequest(UUID exerciseDefinitionId) {
        return new ExerciseConfigRequest(
                null,
                exerciseDefinitionId,
                "Low Row",
                3,
                "Cable",
                8,
                null,
                ProgressionMode.REPS_FIRST,
                PrimaryBenchmark.TOP_SET,
                90,
                false
        );
    }
}
