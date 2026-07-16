package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.analysis.ProgressionAnalyser;
import com.louisfiges.workout.analysis.types.ExerciseType;
import com.louisfiges.workout.analysis.types.PrimaryBenchmark;
import com.louisfiges.workout.analysis.types.ProgressionMode;
import com.louisfiges.workout.analysis.types.ProgressionStrategy;
import com.louisfiges.workout.analysis.types.SuggestionType;
import com.louisfiges.workout.analysis.types.TrainingState;
import com.louisfiges.workout.dao.periodisation.Block;
import com.louisfiges.workout.dao.periodisation.Programme;
import com.louisfiges.workout.dao.periodisation.Split;
import com.louisfiges.workout.dao.periodisation.SplitWorkoutAssignment;
import com.louisfiges.workout.dao.periodisation.Week;
import com.louisfiges.workout.dao.workout.ExerciseCatalogMuscleGroup;
import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dao.workout.ExerciseEntry;
import com.louisfiges.workout.dao.workout.ExerciseInfo;
import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.dto.responses.insights.BlockSummaryDTO;
import com.louisfiges.workout.dto.responses.insights.NextWorkoutSignalDTO;
import com.louisfiges.workout.dto.responses.insights.PrioritySignalDTO;
import com.louisfiges.workout.heatmap.MappingSource;
import com.louisfiges.workout.heatmap.MuscleGroupId;
import com.louisfiges.workout.periodisation.BlockType;
import com.louisfiges.workout.repository.SplitRepository;
import com.louisfiges.workout.repository.WorkoutEntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("TrainingInsightsService")
class TrainingInsightsServiceTest {

    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Mock
    private SplitRepository splitRepository;

    @Mock
    private WorkoutEntryRepository workoutEntryRepository;

    private TrainingInsightsService service;

    @BeforeEach
    void setUp() {
        service = new TrainingInsightsService(
                new TrainingInsightHistoryAssembler(splitRepository, workoutEntryRepository),
                new TrainingInsightSummarizer(),
                new ProgressionAnalyser(5)
        );
    }

    @Test
    @DisplayName("returns the exact RPE-driven increase message for a completed low-RPE session")
    void returnsIncreaseRecommendationForSuccessfulSessionAtTheBlockCeiling() {
        Fixture fixture = fixture(
                "Back Squat",
                "Barbell",
                MuscleGroupId.quads,
                null,
                10.0,
                8
        );
        when(splitRepository.findActiveByUserIdWithWorkouts(USER_ID)).thenReturn(Optional.of(fixture.split()));
        when(workoutEntryRepository.findDetailedHistoryByUserId(USER_ID)).thenReturn(List.of(
                workoutEntry(fixture.template(), fixture.definition(), fixture.config(), Instant.now().truncatedTo(ChronoUnit.SECONDS), 8, 150.0, 10.0)
        ));

        NextWorkoutSignalDTO signal = service.getNextWorkoutSignal(USER_ID);

        assertThat(signal.suggestionType()).isEqualTo(SuggestionType.INCREASE);
        assertThat(signal.suggestedWeightKg()).isEqualTo(155.0);
        assertThat(signal.reasoning()).isEqualTo(
                "All sets completed at RPE 10.0 - within your block target. Try 155.0kg next session."
        );
    }

    @Test
    @DisplayName("keeps the weight steady when successful work is above the block target")
    void keepsSuccessfulHighRpeSessionAtTheSameWeight() {
        Fixture fixture = fixture(
                "Press",
                "Barbell",
                MuscleGroupId.chest,
                null,
                8.5,
                8
        );
        when(splitRepository.findActiveByUserIdWithWorkouts(USER_ID)).thenReturn(Optional.of(fixture.split()));
        when(workoutEntryRepository.findDetailedHistoryByUserId(USER_ID)).thenReturn(List.of(
                workoutEntry(fixture.template(), fixture.definition(), fixture.config(), Instant.now().truncatedTo(ChronoUnit.SECONDS), 8, 150.0, 9.0)
        ));

        NextWorkoutSignalDTO signal = service.getNextWorkoutSignal(USER_ID);

        assertThat(signal.suggestionType()).isEqualTo(SuggestionType.MAINTAIN);
        assertThat(signal.suggestedWeightKg()).isEqualTo(150.0);
        assertThat(signal.reasoning()).contains("Stay at 150.0kg");
    }

    @Test
    @DisplayName("marks a stable high-RPE exercise as plateau risk and surfaces the plateau headline")
    void marksPlateauRiskAsTheTopPriority() {
        Fixture fixture = fixture(
                "Low Row",
                "Cable",
                null,
                "Back",
                8.5,
                8
        );
        when(splitRepository.findActiveByUserIdWithWorkouts(USER_ID)).thenReturn(Optional.of(fixture.split()));
        when(workoutEntryRepository.findDetailedHistoryByUserId(USER_ID)).thenReturn(List.of(
                workoutEntry(fixture.template(), fixture.definition(), fixture.config(), Instant.now().truncatedTo(ChronoUnit.SECONDS), 8, 140.0, 9.0),
                workoutEntry(fixture.template(), fixture.definition(), fixture.config(), Instant.now().minus(7, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS), 8, 140.0, 9.0),
                workoutEntry(fixture.template(), fixture.definition(), fixture.config(), Instant.now().minus(14, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS), 8, 140.0, 9.0)
        ));

        List<PrioritySignalDTO> signals = service.getPrioritySignals(USER_ID);
        BlockSummaryDTO summary = service.getBlockSummary(USER_ID);

        assertThat(signals).hasSize(1);
        assertThat(signals.get(0).rank()).isEqualTo(1);
        assertThat(signals.get(0).exerciseDefinitionId()).isEqualTo(fixture.definition().getId());
        assertThat(signals.get(0).trainingState()).isEqualTo(TrainingState.TRUE_PLATEAU);
        assertThat(summary.overallState()).isEqualTo(TrainingState.TRUE_PLATEAU);
        assertThat(summary.headline()).isEqualTo("Plateau risk: low row needs review");
        assertThat(summary.focus()).isEqualTo("Progress looks capped.");
    }

    @Test
    @DisplayName("hides exercises with no history while still ranking the exercised lift")
    void hidesExercisesWithNoHistoryWhileStillRankingTheExercisedLift() {
        Fixture historyFixture = fixture(
                "Low Row",
                "Cable",
                null,
                "Back",
                9.5,
                8
        );

        ExerciseDefinition noHistoryDefinition = definition(
                "Face Pull",
                null,
                MuscleGroupId.rear_delt,
                "Rear Delt"
        );
        ExerciseConfig noHistoryConfig = config(noHistoryDefinition, 8);

        WorkoutTemplate template = new WorkoutTemplate(
                "Upper Day",
                USER_ID,
                "Upper",
                List.of(historyFixture.config(), noHistoryConfig)
        );
        ReflectionTestUtils.setField(template, "id", UUID.randomUUID());

        Block block = new Block();
        block.setName("Block A");
        block.setBlockType(BlockType.STRENGTH);
        block.setProgressionStrategy(ProgressionStrategy.WEIGHT_FIRST);
        block.setDurationWeeks(4);
        block.setTargetRpeMin(7.0);
        block.setTargetRpeMax(9.5);
        block.setRepRangeMin(5);
        block.setRepRangeMax(10);
        block.setBlockOrder(0);
        block.setStartDate(Instant.now().minus(2, ChronoUnit.DAYS));

        Week week = new Week();
        week.setBlock(block);
        week.setWeekNumber(1);
        week.setDeload(false);
        week.setTargetSetsPerExercise(3);
        block.getWeeks().add(week);

        Programme programme = new Programme();
        programme.setActive(true);
        programme.setStartDate(Instant.now().minus(2, ChronoUnit.DAYS));
        programme.setSplit(null);
        programme.getBlocks().add(block);
        block.setProgramme(programme);

        Split split = new Split();
        split.setActive(true);
        split.getAssignments().add(new SplitWorkoutAssignment(split, template, 3, 0));
        split.getProgrammes().add(programme);
        programme.setSplit(split);

        when(splitRepository.findActiveByUserIdWithWorkouts(USER_ID)).thenReturn(Optional.of(split));
        when(workoutEntryRepository.findDetailedHistoryByUserId(USER_ID)).thenReturn(List.of(
                workoutEntry(template, historyFixture.definition(), historyFixture.config(), Instant.now().truncatedTo(ChronoUnit.SECONDS), 8, 140.0, 9.0)
        ));

        NextWorkoutSignalDTO signal = service.getNextWorkoutSignal(USER_ID);
        List<PrioritySignalDTO> priorities = service.getPrioritySignals(USER_ID);

        assertThat(signal.exerciseDefinitionId()).isEqualTo(historyFixture.definition().getId());
        assertThat(signal.suggestionType()).isEqualTo(SuggestionType.INCREASE);
        assertThat(signal.suggestedWeightKg()).isEqualTo(142.5);
        assertThat(priorities).hasSize(1);
        assertThat(priorities.get(0).exerciseDefinitionId()).isEqualTo(historyFixture.definition().getId());
        assertThat(priorities.get(0).trainingState()).isEqualTo(TrainingState.IMPROVING);
    }

    @Test
    @DisplayName("returns the empty next-workout state when every configured lift has no history")
    void returnsEmptyNextWorkoutStateWhenEveryConfiguredLiftHasNoHistory() {
        Fixture fixture = fixture(
                "Low Row",
                "Cable",
                null,
                "Back",
                9.5,
                8
        );
        when(splitRepository.findActiveByUserIdWithWorkouts(USER_ID)).thenReturn(Optional.of(fixture.split()));
        when(workoutEntryRepository.findDetailedHistoryByUserId(USER_ID)).thenReturn(List.of());

        NextWorkoutSignalDTO signal = service.getNextWorkoutSignal(USER_ID);
        List<PrioritySignalDTO> priorities = service.getPrioritySignals(USER_ID);

        assertThat(signal.suggestionType()).isEqualTo(SuggestionType.INSUFFICIENT_DATA);
        assertThat(signal.trainingState()).isEqualTo(TrainingState.UNDEREXPOSED);
        assertThat(signal.exerciseDefinitionId()).isNull();
        assertThat(signal.reasoning()).isEqualTo("No usable exercise history available yet.");
        assertThat(priorities).isEmpty();
    }

    @Test
    @DisplayName("keeps focused exercises visible even when they have no history")
    void keepsFocusedExercisesVisibleEvenWhenTheyHaveNoHistory() {
        Fixture fixture = fixture(
                "Face Pull",
                null,
                MuscleGroupId.rear_delt,
                "Rear Delt",
                9.0,
                12
        );
        fixture.config().setFocus(true);

        when(splitRepository.findActiveByUserIdWithWorkouts(USER_ID)).thenReturn(Optional.of(fixture.split()));
        when(workoutEntryRepository.findDetailedHistoryByUserId(USER_ID)).thenReturn(List.of());

        NextWorkoutSignalDTO signal = service.getNextWorkoutSignal(USER_ID);
        List<PrioritySignalDTO> priorities = service.getPrioritySignals(USER_ID);

        assertThat(signal.exerciseDefinitionId()).isEqualTo(fixture.definition().getId());
        assertThat(signal.suggestionType()).isEqualTo(SuggestionType.INSUFFICIENT_DATA);
        assertThat(signal.trainingState()).isEqualTo(TrainingState.UNDEREXPOSED);
        assertThat(signal.reasoning()).isEqualTo("No exercise history available.");
        assertThat(priorities).hasSize(1);
        assertThat(priorities.get(0).exerciseDefinitionId()).isEqualTo(fixture.definition().getId());
        assertThat(priorities.get(0).suggestionType()).isEqualTo(SuggestionType.INSUFFICIENT_DATA);
        assertThat(priorities.get(0).trainingState()).isEqualTo(TrainingState.UNDEREXPOSED);
    }

    private Fixture fixture(
            String exerciseName,
            String variant,
            MuscleGroupId primaryMuscle,
            String mainMuscle,
            double targetRpeMax,
            int goalReps
    ) {
        ExerciseDefinition definition = new ExerciseDefinition();
        definition.setExerciseName(exerciseName);
        definition.setVariant(variant);
        definition.setNormalizedExerciseName(exerciseName.toLowerCase());
        definition.setNormalizedVariant(variant == null ? "" : variant.toLowerCase());
        definition.setPrimaryMuscle(primaryMuscle);
        definition.setMappingSource(MappingSource.AUTO);
        if (mainMuscle != null) {
            ExerciseInfo info = new ExerciseInfo();
            info.setMainMuscle(new ExerciseCatalogMuscleGroup(mainMuscle));
            definition.setExerciseInfo(info);
        }
        ReflectionTestUtils.setField(definition, "id", UUID.randomUUID());

        ExerciseConfig config = new ExerciseConfig(
                definition,
                3,
                goalReps,
                ProgressionMode.WEIGHT_FIRST,
                PrimaryBenchmark.WORKING_SETS,
                90,
                false
        );
        config.setExerciseConfigId(UUID.randomUUID());

        WorkoutTemplate template = new WorkoutTemplate("Upper Day", USER_ID, "Upper", List.of(config));
        ReflectionTestUtils.setField(template, "id", UUID.randomUUID());

        Block block = new Block();
        block.setName("Block A");
        block.setBlockType(BlockType.STRENGTH);
        block.setProgressionStrategy(ProgressionStrategy.WEIGHT_FIRST);
        block.setDurationWeeks(4);
        block.setTargetRpeMin(7.0);
        block.setTargetRpeMax(targetRpeMax);
        block.setRepRangeMin(5);
        block.setRepRangeMax(10);
        block.setBlockOrder(0);
        block.setStartDate(Instant.now().minus(2, ChronoUnit.DAYS));

        Week week = new Week();
        week.setBlock(block);
        week.setWeekNumber(1);
        week.setDeload(false);
        week.setTargetSetsPerExercise(3);
        block.getWeeks().add(week);

        Programme programme = new Programme();
        programme.setActive(true);
        programme.setStartDate(Instant.now().minus(2, ChronoUnit.DAYS));
        programme.setSplit(null);
        programme.getBlocks().add(block);
        block.setProgramme(programme);

        Split split = new Split();
        split.setActive(true);
        split.getAssignments().add(new SplitWorkoutAssignment(split, template, 3, 0));
        split.getProgrammes().add(programme);
        programme.setSplit(split);

        return new Fixture(split, template, definition, config);
    }

    private ExerciseDefinition definition(
            String exerciseName,
            String variant,
            MuscleGroupId primaryMuscle,
            String mainMuscle
    ) {
        ExerciseDefinition definition = new ExerciseDefinition();
        definition.setExerciseName(exerciseName);
        definition.setVariant(variant);
        definition.setNormalizedExerciseName(exerciseName.toLowerCase());
        definition.setNormalizedVariant(variant == null ? "" : variant.toLowerCase());
        definition.setPrimaryMuscle(primaryMuscle);
        definition.setMappingSource(MappingSource.AUTO);
        if (mainMuscle != null) {
            ExerciseInfo info = new ExerciseInfo();
            info.setMainMuscle(new ExerciseCatalogMuscleGroup(mainMuscle));
            definition.setExerciseInfo(info);
        }
        ReflectionTestUtils.setField(definition, "id", UUID.randomUUID());
        return definition;
    }

    private ExerciseConfig config(ExerciseDefinition definition, int goalReps) {
        ExerciseConfig config = new ExerciseConfig(
                definition,
                3,
                goalReps,
                ProgressionMode.WEIGHT_FIRST,
                PrimaryBenchmark.WORKING_SETS,
                90,
                false
        );
        config.setExerciseConfigId(UUID.randomUUID());
        return config;
    }

    private WorkoutEntry workoutEntry(
            WorkoutTemplate template,
            ExerciseDefinition definition,
            ExerciseConfig config,
            Instant createdAt,
            int repsPerSet,
            double weight,
            double rpe
    ) {
        List<SetEntry> sets = List.of(
                new SetEntry(repsPerSet, weight, rpe, null),
                new SetEntry(repsPerSet, weight, rpe, null),
                new SetEntry(repsPerSet, weight, rpe, null)
        );
        ExerciseEntry exerciseEntry = new ExerciseEntry(
                definition,
                definition.getExerciseName(),
                definition.getVariant(),
                config.getGoalSets(),
                sets
        );
        WorkoutEntry workoutEntry = new WorkoutEntry(template, USER_ID, List.of(exerciseEntry), null);
        ReflectionTestUtils.setField(workoutEntry, "createdAt", createdAt);
        return workoutEntry;
    }

    private record Fixture(
            Split split,
            WorkoutTemplate template,
            ExerciseDefinition definition,
            ExerciseConfig config
    ) {
    }
}
