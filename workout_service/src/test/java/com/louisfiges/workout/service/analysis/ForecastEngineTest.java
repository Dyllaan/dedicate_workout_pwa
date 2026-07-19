package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.dao.periodisation.*;
import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.dto.responses.ForecastResponse;
import com.louisfiges.workout.dto.responses.ForecastSource;
import com.louisfiges.workout.periodisation.BlockType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ForecastEngine")
class ForecastEngineTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID EXERCISE_DEF_ID = UUID.randomUUID();

    @Mock
    private BlockAwareOneRmService oneRmService;

    private ForecastEngine engine;

    @BeforeEach
    void setUp() {
        engine = new ForecastEngine(oneRmService);
    }

    @Test
    @DisplayName("returns NO_DATA when block has no resolvable dates")
    void noDataWhenNoBlockDates() {
        Block block = createBaseBlock(null, BlockType.STRENGTH);
        block.setProgramme(createProgrammeWithSplit(block, List.of()));

        Programme programme = block.getProgramme();
        programme.setStartDate(null);

        Split split = programme.getSplit();
        WorkoutTemplate template = new WorkoutTemplate();
        ExerciseConfig focusConfig = new ExerciseConfig();
        focusConfig.setExerciseDefinition(createExerciseDef(EXERCISE_DEF_ID, "Bench Press"));
        focusConfig.setFocus(true);
        template.setExercises(List.of(focusConfig));
        split.getAssignments().add(new SplitWorkoutAssignment(split, template, 1, 0));

        Week week = new Week();
        week.setId(UUID.randomUUID());
        week.setWeekNumber(1);
        week.setDeload(false);
        week.setTargetSetsPerExercise(4);
        week.setBlock(block);

        when(oneRmService.resolveEffectiveDateRange(any(Block.class))).thenReturn(null);

        ForecastResponse response = engine.generateForecast(week, USER_ID);
        assertThat(response.insights()).allMatch(i -> i.source() == ForecastSource.NO_DATA);
    }

    @Test
    @DisplayName("computes e1RM and target weight from current block sets")
    void computesFromCurrentBlock() {
        Instant blockStart = Instant.parse("2026-07-01T00:00:00Z");
        Week week = createWeekWithFocusExercises(blockStart, 4, EXERCISE_DEF_ID, "Bench Press");
        week.setWeekNumber(1);

        SetEntry bestSet = new SetEntry(5, 100.0, 8.0, null);
        BlockAwareOneRmService.BlockDateRange blockRange = new BlockAwareOneRmService.BlockDateRange(
                blockStart, blockStart.plusSeconds(4 * 7 * 24 * 3600L));
        BlockAwareOneRmService.OneRmResult mockResult = new BlockAwareOneRmService.OneRmResult(
                116.67, 112.5, 117.46, bestSet, Instant.parse("2026-07-02T10:00:00Z"), false);

        when(oneRmService.resolveEffectiveDateRange(any(Block.class))).thenReturn(blockRange);
        when(oneRmService.estimateOneRm(eq(EXERCISE_DEF_ID), eq(USER_ID), any(Instant.class), any(Instant.class), eq(false)))
                .thenReturn(mockResult);

        ForecastResponse response = engine.generateForecast(week, USER_ID);
        ForecastResponse.ForecastInsight insight = response.insights().get(0);

        assertThat(insight.source()).isEqualTo(ForecastSource.CURRENT_BLOCK);
        assertThat(insight.estimatedOneRmKg()).isNotNull();
        assertThat(insight.targetWeightKg()).isNotNull();
        assertThat(insight.targetReps()).isEqualTo(5);
        assertThat(insight.bestSet()).isNotNull();
        assertThat(insight.bestSet().reps()).isEqualTo(5);
        assertThat(insight.bestSet().weightKg()).isEqualTo(100.0);
    }

    @Test
    @DisplayName("falls back to previous block when current block has no sets")
    void fallsBackToPreviousBlock() {
        Instant blockStart = Instant.parse("2026-07-01T00:00:00Z");
        BlockAwareOneRmService.BlockDateRange blockRange = new BlockAwareOneRmService.BlockDateRange(
                blockStart, blockStart.plusSeconds(4 * 7 * 24 * 3600L));

        Block previousBlock = createBaseBlock(Instant.parse("2026-06-01T00:00:00Z"), BlockType.HYPERTROPHY);
        previousBlock.setBlockOrder(0);

        Week week = createWeekWithFocusExercises(blockStart, 4, EXERCISE_DEF_ID, "Bench Press");

        Programme programme = week.getBlock().getProgramme();
        previousBlock.setProgramme(programme);
        programme.getBlocks().add(0, previousBlock);

        week.setWeekNumber(1);

        when(oneRmService.resolveEffectiveDateRange(any(Block.class))).thenReturn(blockRange);
        when(oneRmService.estimateOneRm(eq(EXERCISE_DEF_ID), eq(USER_ID), any(Instant.class), any(Instant.class), eq(false)))
                .thenReturn(null);
        when(oneRmService.findPreviousBlock(any(Block.class))).thenReturn(previousBlock);
        when(oneRmService.estimateOneRm(eq(EXERCISE_DEF_ID), eq(USER_ID), any(Instant.class), any(Instant.class), eq(true)))
                .thenReturn(null);

        ForecastResponse response = engine.generateForecast(week, USER_ID);
        assertThat(response.insights().get(0).source()).isEqualTo(ForecastSource.NO_DATA);
    }

    @Test
    @DisplayName("only returns focus exercises")
    void onlyFocusExercises() {
        Instant blockStart = Instant.parse("2026-07-01T00:00:00Z");

        Block block = createBaseBlock(blockStart, BlockType.STRENGTH);
        Programme programme = new Programme();
        programme.setStartDate(blockStart);
        programme.setBlocks(new ArrayList<>(List.of(block)));
        block.setProgramme(programme);

        Split split = new Split();
        WorkoutTemplate template = new WorkoutTemplate();

        ExerciseConfig focusConfig = new ExerciseConfig();
        ExerciseDefinition focusDef = createExerciseDef(EXERCISE_DEF_ID, "Bench Press");
        focusConfig.setExerciseDefinition(focusDef);
        focusConfig.setFocus(true);

        ExerciseConfig accessoryConfig = new ExerciseConfig();
        ExerciseDefinition accessoryDef = createExerciseDef(UUID.randomUUID(), "Tricep Pushdown");
        accessoryConfig.setExerciseDefinition(accessoryDef);
        accessoryConfig.setFocus(false);

        template.setExercises(List.of(focusConfig, accessoryConfig));
        split.getAssignments().add(new SplitWorkoutAssignment(split, template, 1, 0));
        programme.setSplit(split);

        Week week = new Week();
        week.setId(UUID.randomUUID());
        week.setWeekNumber(1);
        week.setDeload(false);
        week.setTargetSetsPerExercise(4);
        week.setBlock(block);

        SetEntry bestSet = new SetEntry(5, 100.0, 8.0, null);
        BlockAwareOneRmService.BlockDateRange blockRange = new BlockAwareOneRmService.BlockDateRange(
                blockStart, blockStart.plusSeconds(4 * 7 * 24 * 3600L));
        BlockAwareOneRmService.OneRmResult mockResult = new BlockAwareOneRmService.OneRmResult(
                116.67, 112.5, 117.46, bestSet, Instant.parse("2026-07-02T10:00:00Z"), false);

        when(oneRmService.resolveEffectiveDateRange(any(Block.class))).thenReturn(blockRange);
        when(oneRmService.estimateOneRm(eq(EXERCISE_DEF_ID), eq(USER_ID), any(Instant.class), any(Instant.class), eq(false)))
                .thenReturn(mockResult);

        ForecastResponse response = engine.generateForecast(week, USER_ID);
        assertThat(response.insights()).hasSize(1);
        assertThat(response.insights().get(0).exerciseName()).isEqualTo("Bench Press");
    }

    // --- helpers ---

    private Block createBaseBlock(Instant blockStart, BlockType blockType) {
        Block block = new Block();
        block.setId(UUID.randomUUID());
        block.setName("Test Block");
        block.setBlockType(blockType);
        block.setProgressionStrategy(com.louisfiges.workout.analysis.types.ProgressionStrategy.WEIGHT_FIRST);
        block.setDurationWeeks(4);
        block.setTargetRpeMin(7.0);
        block.setTargetRpeMax(9.0);
        block.setRepRangeMin(3);
        block.setRepRangeMax(5);
        block.setBlockOrder(0);
        block.setStartDate(blockStart);
        block.setWeeks(Collections.emptyList());
        return block;
    }

    private Programme createProgrammeWithSplit(Block block, List<Block> extraBlocks) {
        Programme programme = new Programme();
        programme.setStartDate(block.getStartDate());
        List<Block> allBlocks = new ArrayList<>();
        allBlocks.addAll(extraBlocks);
        allBlocks.add(block);
        programme.setBlocks(allBlocks);

        Split split = new Split();
        programme.setSplit(split);

        return programme;
    }

    private Week createWeekWithFocusExercises(Instant blockStart, int durationWeeks, UUID exerciseDefId, String exerciseName) {
        Block block = createBaseBlock(blockStart, BlockType.STRENGTH);

        Programme programme = new Programme();
        programme.setStartDate(blockStart);
        programme.setBlocks(new ArrayList<>(List.of(block)));
        block.setProgramme(programme);

        Split split = new Split();
        WorkoutTemplate template = new WorkoutTemplate();

        ExerciseConfig focusConfig = new ExerciseConfig();
        ExerciseDefinition focusDef = createExerciseDef(exerciseDefId, exerciseName);
        focusConfig.setExerciseDefinition(focusDef);
        focusConfig.setFocus(true);
        template.setExercises(List.of(focusConfig));
        split.getAssignments().add(new SplitWorkoutAssignment(split, template, 1, 0));
        programme.setSplit(split);

        Week week = new Week();
        week.setId(UUID.randomUUID());
        week.setWeekNumber(1);
        week.setDeload(false);
        week.setTargetSetsPerExercise(4);
        week.setBlock(block);

        List<Week> weeks = new ArrayList<>();
        for (int i = 1; i <= durationWeeks; i++) {
            Week w = new Week();
            w.setId(UUID.randomUUID());
            w.setWeekNumber(i);
            w.setDeload(false);
            w.setTargetSetsPerExercise(4);
            w.setBlock(block);
            weeks.add(w);
        }
        block.setWeeks(weeks);

        return week;
    }

    private ExerciseDefinition createExerciseDef(UUID id, String name) {
        ExerciseDefinition def = new ExerciseDefinition();
        try {
            Field idField = ExerciseDefinition.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(def, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        def.setExerciseName(name);
        def.setNormalizedExerciseName(name.toLowerCase());
        def.setNormalizedVariant("");
        def.setUserId(USER_ID);
        return def;
    }
}
