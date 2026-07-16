package com.louisfiges.workout.service.workout;

import com.louisfiges.workout.analysis.types.PrimaryBenchmark;
import com.louisfiges.workout.analysis.types.ProgressionMode;
import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.dto.ExerciseConfigDTO;
import com.louisfiges.workout.dto.request.ExerciseConfigGoalRepsRequest;
import com.louisfiges.workout.dto.request.ExerciseConfigGoalSetsRequest;
import com.louisfiges.workout.dto.request.ExerciseConfigPrimaryBenchmarkRequest;
import com.louisfiges.workout.dto.request.ExerciseConfigProgressionModeRequest;
import com.louisfiges.workout.dto.request.ExerciseConfigTargetRestSecondsRequest;
import com.louisfiges.workout.exception.exceptions.BadRequestException;
import com.louisfiges.workout.exception.exceptions.ResourceNotFoundException;
import com.louisfiges.workout.repository.ExerciseConfigRepository;
import com.louisfiges.workout.service.analysis.AnalysisCacheEvictor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ExerciseConfigService")
class ExerciseConfigServiceTest {

    @Mock
    private ExerciseConfigRepository repository;

    @Mock
    private AnalysisCacheEvictor analysisCacheEvictor;

    private ExerciseConfigService service;
    private UUID userId;
    private UUID configId;
    private UUID templateId;
    private ExerciseConfig config;

    @BeforeEach
    void setUp() {
        service = new ExerciseConfigService(repository, analysisCacheEvictor);
        userId = UUID.randomUUID();
        configId = UUID.randomUUID();
        templateId = UUID.randomUUID();
        config = newConfig(3, 8, 90, false, ProgressionMode.WEIGHT_FIRST, PrimaryBenchmark.WORKING_SETS);
    }

    @Test
    @DisplayName("returns the requested exercise config")
    void returnsRequestedExerciseConfig() {
        when(repository.findByExerciseConfigIdAndWorkoutTemplateUserId(configId, userId))
                .thenReturn(Optional.of(config));

        ExerciseConfigDTO result = service.getById(configId, userId);

        assertThat(result.goalSets()).isEqualTo(3);
        assertThat(result.goalReps()).isEqualTo(8);
        assertThat(result.targetRestSeconds()).isEqualTo(90);
    }

    @Test
    @DisplayName("updates goal sets after validating the minimum")
    void updatesGoalSets() {
        when(repository.findByExerciseConfigIdAndWorkoutTemplateUserId(configId, userId))
                .thenReturn(Optional.of(config));
        when(repository.save(any(ExerciseConfig.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ExerciseConfigDTO result = service.setGoalSets(configId, userId, new ExerciseConfigGoalSetsRequest(5));

        assertThat(result.goalSets()).isEqualTo(5);
        assertThat(config.getGoalSets()).isEqualTo(5);
    }

    @Test
    @DisplayName("rejects goal sets below one")
    void rejectsInvalidGoalSets() {
        when(repository.findByExerciseConfigIdAndWorkoutTemplateUserId(configId, userId))
                .thenReturn(Optional.of(config));

        assertThatThrownBy(() -> service.setGoalSets(configId, userId, new ExerciseConfigGoalSetsRequest(0)))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Goal sets must be at least 1");
    }

    @Test
    @DisplayName("updates goal reps and allows clearing them")
    void updatesGoalReps() {
        when(repository.findByExerciseConfigIdAndWorkoutTemplateUserId(configId, userId))
                .thenReturn(Optional.of(config));
        when(repository.save(any(ExerciseConfig.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ExerciseConfigDTO cleared = service.setGoalReps(configId, userId, new ExerciseConfigGoalRepsRequest(null));
        assertThat(cleared.goalReps()).isNull();

        ExerciseConfigDTO updated = service.setGoalReps(configId, userId, new ExerciseConfigGoalRepsRequest(10));
        assertThat(updated.goalReps()).isEqualTo(10);
    }

    @Test
    @DisplayName("rejects invalid goal reps")
    void rejectsInvalidGoalReps() {
        when(repository.findByExerciseConfigIdAndWorkoutTemplateUserId(configId, userId))
                .thenReturn(Optional.of(config));

        assertThatThrownBy(() -> service.setGoalReps(configId, userId, new ExerciseConfigGoalRepsRequest(0)))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Goal reps must be at least 1");
    }

    @Test
    @DisplayName("updates progression mode and primary benchmark")
    void updatesEnums() {
        when(repository.findByExerciseConfigIdAndWorkoutTemplateUserId(configId, userId))
                .thenReturn(Optional.of(config));
        when(repository.save(any(ExerciseConfig.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ExerciseConfigDTO progressionUpdated = service.setProgressionMode(
                configId,
                userId,
                new ExerciseConfigProgressionModeRequest(ProgressionMode.REPS_FIRST)
        );
        ExerciseConfigDTO benchmarkUpdated = service.setPrimaryBenchmark(
                configId,
                userId,
                new ExerciseConfigPrimaryBenchmarkRequest(PrimaryBenchmark.TOP_SET)
        );

        assertThat(progressionUpdated.progressionMode()).isEqualTo(ProgressionMode.REPS_FIRST);
        assertThat(benchmarkUpdated.primaryBenchmark()).isEqualTo(PrimaryBenchmark.TOP_SET);
    }

    @Test
    @DisplayName("rejects missing progression mode and benchmark values")
    void rejectsMissingEnumValues() {
        when(repository.findByExerciseConfigIdAndWorkoutTemplateUserId(configId, userId))
                .thenReturn(Optional.of(config));

        assertThatThrownBy(() -> service.setProgressionMode(configId, userId, new ExerciseConfigProgressionModeRequest(null)))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Progression mode is required");

        assertThatThrownBy(() -> service.setPrimaryBenchmark(configId, userId, new ExerciseConfigPrimaryBenchmarkRequest(null)))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Primary benchmark is required");
    }

    @Test
    @DisplayName("updates target rest seconds and allows clearing them")
    void updatesTargetRestSeconds() {
        when(repository.findByExerciseConfigIdAndWorkoutTemplateUserId(configId, userId))
                .thenReturn(Optional.of(config));
        when(repository.save(any(ExerciseConfig.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ExerciseConfigDTO cleared = service.setTargetRestSeconds(configId, userId, new ExerciseConfigTargetRestSecondsRequest(null));
        assertThat(cleared.targetRestSeconds()).isNull();

        ExerciseConfigDTO updated = service.setTargetRestSeconds(configId, userId, new ExerciseConfigTargetRestSecondsRequest(75));
        assertThat(updated.targetRestSeconds()).isEqualTo(75);
    }

    @Test
    @DisplayName("rejects target rest seconds outside the supported range")
    void rejectsInvalidRestSeconds() {
        when(repository.findByExerciseConfigIdAndWorkoutTemplateUserId(configId, userId))
                .thenReturn(Optional.of(config));

        assertThatThrownBy(() -> service.setTargetRestSeconds(configId, userId, new ExerciseConfigTargetRestSecondsRequest(7201)))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Rest time must be between 0 and 7200 seconds");
    }

    @Test
    @DisplayName("toggles focus on and clears sibling configs")
    void togglesFocusOnAndClearsSiblings() {
        WorkoutTemplate template = template();
        ExerciseConfig first = newConfig(3, 8, 90, true, ProgressionMode.WEIGHT_FIRST, PrimaryBenchmark.WORKING_SETS);
        ExerciseConfig second = newConfig(4, 10, 75, false, ProgressionMode.REPS_FIRST, PrimaryBenchmark.TOP_SET);
        ExerciseConfig third = newConfig(2, null, 60, false, ProgressionMode.WEIGHT_FIRST, PrimaryBenchmark.WORKING_SETS);

        first.setExerciseConfigId(UUID.randomUUID());
        second.setExerciseConfigId(configId);
        third.setExerciseConfigId(UUID.randomUUID());
        first.setWorkoutTemplate(template);
        second.setWorkoutTemplate(template);
        third.setWorkoutTemplate(template);

        when(repository.findByExerciseConfigIdAndWorkoutTemplateUserId(configId, userId))
                .thenReturn(Optional.of(second));
        when(repository.findAllByWorkoutTemplateIdAndWorkoutTemplateUserId(templateId, userId))
                .thenReturn(List.of(first, second, third));
        when(repository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        ExerciseConfigDTO enabled = service.toggleFocus(configId, userId);
        assertThat(enabled.focus()).isTrue();
        assertThat(first.getFocus()).isFalse();
        assertThat(second.getFocus()).isTrue();
        assertThat(third.getFocus()).isFalse();

        when(repository.findByExerciseConfigIdAndWorkoutTemplateUserId(configId, userId))
                .thenReturn(Optional.of(second));
        when(repository.findAllByWorkoutTemplateIdAndWorkoutTemplateUserId(templateId, userId))
                .thenReturn(List.of(first, second, third));

        ExerciseConfigDTO disabled = service.toggleFocus(configId, userId);
        assertThat(disabled.focus()).isFalse();
    }

    @Test
    @DisplayName("throws not found for missing or foreign-owned configs")
    void rejectsMissingConfigs() {
        when(repository.findByExerciseConfigIdAndWorkoutTemplateUserId(configId, userId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(configId, userId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Exercise config not found");
    }

    private ExerciseConfig newConfig(
            int goalSets,
            Integer goalReps,
            Integer targetRestSeconds,
            Boolean focus,
            ProgressionMode progressionMode,
            PrimaryBenchmark primaryBenchmark
    ) {
        ExerciseDefinition definition = new ExerciseDefinition();
        definition.setExerciseName("Low Row");
        definition.setVariant("Cable");
        definition.setMappingSource(com.louisfiges.workout.heatmap.MappingSource.AUTO);

        WorkoutTemplate template = template();
        ExerciseConfig exerciseConfig = new ExerciseConfig(
                definition,
                goalSets,
                goalReps,
                progressionMode,
                primaryBenchmark,
                targetRestSeconds,
                focus
        );
        exerciseConfig.setWorkoutTemplate(template);
        return exerciseConfig;
    }

    private WorkoutTemplate template() {
        WorkoutTemplate template = new WorkoutTemplate();
        template.setId(templateId);
        template.setUserId(userId);
        return template;
    }
}
