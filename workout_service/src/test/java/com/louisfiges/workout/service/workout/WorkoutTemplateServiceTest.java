package com.louisfiges.workout.service.workout;

import com.louisfiges.workout.analysis.types.PrimaryBenchmark;
import com.louisfiges.workout.analysis.types.ProgressionMode;
import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dto.request.ExerciseConfigRequest;
import com.louisfiges.workout.dto.request.WorkoutTemplateRequest;
import com.louisfiges.workout.repository.WorkoutTemplateRepository;
import com.louisfiges.workout.heatmap.MappingSource;
import com.louisfiges.workout.service.analysis.AnalysisCacheEvictor;
import com.louisfiges.workout.service.mapper.ExerciseConfigMapper;
import com.louisfiges.workout.service.mapper.ExerciseDefinitionMapper;
import com.louisfiges.workout.service.mapper.WorkoutTemplateMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("WorkoutTemplateService")
class WorkoutTemplateServiceTest {

    @Mock
    private WorkoutTemplateRepository workoutTemplateRepository;

    @Mock
    private ExerciseDefinitionService exerciseDefinitionService;

    @Mock
    private AnalysisCacheEvictor analysisCacheEvictor;

    private final WorkoutTemplateMapper workoutTemplateMapper =
            new WorkoutTemplateMapper(new ExerciseConfigMapper(new ExerciseDefinitionMapper()));

    @Test
    @DisplayName("flows exercise config request values into ExerciseConfig without any liftRole dependency")
    void flowsExerciseConfigValuesIntoTheEntity() {
        WorkoutTemplateService service = new WorkoutTemplateService(
                workoutTemplateRepository,
                exerciseDefinitionService,
                analysisCacheEvictor,
                workoutTemplateMapper
        );
        UUID userId = UUID.randomUUID();
        UUID definitionId = UUID.randomUUID();

        ExerciseDefinition definition = new ExerciseDefinition();
        definition.setExerciseName("Low Row");
        definition.setVariant("Cable");
        definition.setMappingSource(MappingSource.AUTO);

        when(exerciseDefinitionService.resolveForUser(
                userId,
                definitionId,
                "Low Row",
                "Cable",
                99L
        )).thenReturn(definition);
        when(workoutTemplateRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        WorkoutTemplateRequest request = new WorkoutTemplateRequest(
                "Upper Day",
                "Upper",
                List.of(
                        new ExerciseConfigRequest(
                                null,
                                definitionId,
                                "Low Row",
                                3,
                                "Cable",
                                8,
                                99L,
                                ProgressionMode.REPS_FIRST,
                                PrimaryBenchmark.TOP_SET,
                                90,
                                false
                        )
                )
        );

        service.create(request, userId);

        ArgumentCaptor<com.louisfiges.workout.dao.workout.WorkoutTemplate> captor =
                ArgumentCaptor.forClass(com.louisfiges.workout.dao.workout.WorkoutTemplate.class);
        verify(workoutTemplateRepository).save(captor.capture());

        ExerciseConfig config = captor.getValue().getExercises().get(0);
        assertThat(config.getWorkoutTemplate()).isSameAs(captor.getValue());
        assertThat(config.getExerciseOrder()).isZero();
        assertThat(config.getProgressionMode()).isEqualTo(ProgressionMode.REPS_FIRST);
        assertThat(config.getPrimaryBenchmark()).isEqualTo(PrimaryBenchmark.TOP_SET);
        assertThat(config.getGoalSets()).isEqualTo(3);
        assertThat(config.getGoalReps()).isEqualTo(8);
    }
}
