package com.louisfiges.workout.service.dashboard;

import com.louisfiges.workout.dao.core.BodyweightLog;
import com.louisfiges.workout.dao.periodisation.Block;
import com.louisfiges.workout.dao.periodisation.Programme;
import com.louisfiges.workout.dao.periodisation.Split;
import com.louisfiges.workout.dao.periodisation.SplitWorkoutAssignment;
import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dao.workout.ExerciseEntry;
import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.dto.responses.dashboard.DashboardSummaryDTO;
import com.louisfiges.workout.repository.*;
import com.louisfiges.workout.service.analysis.LiftSummaryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
@DisplayName("DashboardSummaryService")
class DashboardSummaryServiceTest {

    @Test
    @DisplayName("assembles dashboard summary from the split and workout history")
    void assemblesDashboardSummary() {
        UUID userId = UUID.randomUUID();
        UUID splitId = UUID.randomUUID();
        UUID firstWorkoutId = UUID.randomUUID();
        UUID secondWorkoutId = UUID.randomUUID();

        WorkoutTemplate firstWorkout = workoutTemplate(firstWorkoutId, "Push Day", "Push", "Bench Press", 3);
        WorkoutTemplate secondWorkout = workoutTemplate(secondWorkoutId, "Pull Day", "Pull", "Barbell Row", 4);

        Split split = new Split("Upper Lower", userId, List.of(
                new SplitWorkoutAssignment(null, firstWorkout, 1, 0),
                new SplitWorkoutAssignment(null, secondWorkout, 1, 1)
        ));
        split.setId(splitId);
        ReflectionTestUtils.setField(split, "programmes", List.of(programmeWithBlock()));

        WorkoutEntry benchEntry1 = workoutEntry(firstWorkout, userId, "Bench Press", "Barbell", 100.0, 5, Instant.parse("2026-05-01T10:00:00Z"));
        WorkoutEntry benchEntry2 = workoutEntry(firstWorkout, userId, "Bench Press", "Barbell", 120.0, 3, Instant.parse("2026-05-15T10:00:00Z"));

        WorkoutEntry recentPullEntry = workoutEntry(secondWorkout, userId, "Barbell Row", null, 80.0, 8, Instant.parse("2026-05-20T10:00:00Z"));

        WorkoutEntryRepository workoutEntryRepository = mock(WorkoutEntryRepository.class);
        WorkoutTemplateRepository workoutTemplateRepository = mock(WorkoutTemplateRepository.class);
        SplitRepository splitRepository = mock(SplitRepository.class);
        BodyweightLogRepository bodyweightLogRepository = mock(BodyweightLogRepository.class);
        ProgrammeRepository programmeRepository = mock(ProgrammeRepository.class);

        when(workoutTemplateRepository.countByUserId(eq(userId))).thenReturn(2L);
        when(splitRepository.countByUserId(eq(userId))).thenReturn(1L);
        when(splitRepository.findActiveByUserIdWithWorkouts(eq(userId))).thenReturn(Optional.of(split));
        when(workoutEntryRepository.findDetailedHistoryByUserId(eq(userId), any(Pageable.class)))
                .thenReturn(List.of(recentPullEntry, benchEntry2, benchEntry1));
        when(workoutEntryRepository.findDetailedHistoryByUserIdAndCreatedAtBetween(eq(userId), any(), any()))
                .thenReturn(List.of(recentPullEntry, benchEntry2, benchEntry1));
        when(bodyweightLogRepository.findFirstByUserIdAndLoggedAtLessThanEqualOrderByLoggedAtDesc(eq(userId), eq(LocalDate.of(2026, 5, 15))))
                .thenReturn(Optional.of(new BodyweightLog(userId, BigDecimal.valueOf(80), LocalDate.of(2026, 5, 15), null)));

        LiftSummaryService liftSummaryService = new LiftSummaryService(
                workoutEntryRepository,
                workoutTemplateRepository,
                bodyweightLogRepository
        );
        DashboardSummaryService service = new DashboardSummaryService(
                workoutEntryRepository,
                workoutTemplateRepository,
                splitRepository,
                liftSummaryService,
                programmeRepository
        );

        DashboardSummaryDTO summary = service.getSummary(userId);

        assertThat(summary.workoutTemplateCount()).isEqualTo(2);
        assertThat(summary.splitCount()).isEqualTo(1);
        assertThat(summary.activeSplit()).isNotNull();
        assertThat(summary.nextWorkout()).isNotNull();
        assertThat(summary.nextWorkout().id()).isEqualTo(firstWorkoutId);
        assertThat(summary.nextWorkout().previewExercises()).isNotEmpty();
        assertThat(summary.topLift()).isNotNull();
        assertThat(summary.topLift().exerciseName()).isEqualTo("Bench Press");
        assertThat(summary.topLift().variant()).isEqualTo("Barbell");
        assertThat(summary.topLift().personalBestKg()).isEqualTo(120.0);
        assertThat(summary.topLift().improvementKg()).isEqualTo(20.0);
    }

    @Test
    @DisplayName("keeps same-named exercises separate when their definitions differ")
    void keepsSameNamedExercisesSeparateWhenTheirDefinitionsDiffer() {
        UUID userId = UUID.randomUUID();
        UUID splitId = UUID.randomUUID();
        UUID firstWorkoutId = UUID.randomUUID();
        UUID secondWorkoutId = UUID.randomUUID();

        WorkoutTemplate firstWorkout = workoutTemplate(firstWorkoutId, "Push Day", "Push", "Face Pull", 3);
        WorkoutTemplate secondWorkout = workoutTemplate(secondWorkoutId, "Pull Day", "Pull", "Face Pull", 4);

        ExerciseDefinition firstDefinition = firstWorkout.getExercises().get(0).getExerciseDefinition();
        ExerciseDefinition secondDefinition = secondWorkout.getExercises().get(0).getExerciseDefinition();

        Split split = new Split("Upper Lower", userId, List.of(
                new SplitWorkoutAssignment(null, firstWorkout, 1, 0),
                new SplitWorkoutAssignment(null, secondWorkout, 1, 1)
        ));
        split.setId(splitId);
        ReflectionTestUtils.setField(split, "programmes", List.of(programmeWithBlock()));

        WorkoutEntry firstDefinitionEntry1 = workoutEntry(firstWorkout, userId, "Face Pull", null, 25.0, 12, Instant.parse("2026-05-01T10:00:00Z"));
        WorkoutEntry firstDefinitionEntry2 = workoutEntry(firstWorkout, userId, "Face Pull", null, 30.0, 10, Instant.parse("2026-05-15T10:00:00Z"));
        WorkoutEntry secondDefinitionEntry = workoutEntry(secondWorkout, userId, "Face Pull", null, 40.0, 8, Instant.parse("2026-05-20T10:00:00Z"));

        WorkoutEntryRepository workoutEntryRepository = mock(WorkoutEntryRepository.class);
        WorkoutTemplateRepository workoutTemplateRepository = mock(WorkoutTemplateRepository.class);
        SplitRepository splitRepository = mock(SplitRepository.class);
        BodyweightLogRepository bodyweightLogRepository = mock(BodyweightLogRepository.class);
        ProgrammeRepository programmeRepository = mock(ProgrammeRepository.class);

        when(workoutTemplateRepository.countByUserId(eq(userId))).thenReturn(2L);
        when(splitRepository.countByUserId(eq(userId))).thenReturn(1L);
        when(splitRepository.findActiveByUserIdWithWorkouts(eq(userId))).thenReturn(Optional.of(split));
        when(workoutEntryRepository.findDetailedHistoryByUserId(eq(userId), any(Pageable.class)))
                .thenReturn(List.of(secondDefinitionEntry, firstDefinitionEntry2, firstDefinitionEntry1));
        when(workoutEntryRepository.findDetailedHistoryByUserIdAndCreatedAtBetween(eq(userId), any(), any()))
                .thenReturn(List.of(secondDefinitionEntry, firstDefinitionEntry2, firstDefinitionEntry1));

        LiftSummaryService liftSummaryService = new LiftSummaryService(
                workoutEntryRepository,
                workoutTemplateRepository,
                bodyweightLogRepository
        );
        DashboardSummaryService service = new DashboardSummaryService(
                workoutEntryRepository,
                workoutTemplateRepository,
                splitRepository,
                liftSummaryService,
                programmeRepository
        );
        when(programmeRepository.existsBySplitUserId(eq(userId))).thenReturn(true);

        DashboardSummaryDTO summary = service.getSummary(userId);

        assertThat(summary.topLift()).isNotNull();
        assertThat(summary.topLift().exerciseDefinitionId()).isEqualTo(firstDefinition.getId());
        assertThat(summary.topLift().sessionCount()).isEqualTo(2);
        assertThat(summary.topLift().personalBestKg()).isEqualTo(30.0);
    }

    @Test
    @DisplayName("picks a template at random when user has no active split")
    void picksTemplateAtRandomWhenNoActiveSplit() {
        UUID userId = UUID.randomUUID();
        UUID standaloneWorkoutId = UUID.randomUUID();

        WorkoutTemplate standaloneWorkout = workoutTemplate(standaloneWorkoutId, "Leg Day", "Legs", "Squat", 3);

        WorkoutEntryRepository workoutEntryRepository = mock(WorkoutEntryRepository.class);
        WorkoutTemplateRepository workoutTemplateRepository = mock(WorkoutTemplateRepository.class);
        SplitRepository splitRepository = mock(SplitRepository.class);
        BodyweightLogRepository bodyweightLogRepository = mock(BodyweightLogRepository.class);
        ProgrammeRepository programmeRepository = mock(ProgrammeRepository.class);

        // Mock no split context
        when(splitRepository.countByUserId(eq(userId))).thenReturn(0L);
        when(splitRepository.findActiveByUserIdWithWorkouts(eq(userId))).thenReturn(Optional.empty());
        when(workoutTemplateRepository.countByUserId(eq(userId))).thenReturn(1L);

        // Mock returning the standalone template for the user query
        when(workoutTemplateRepository.findByUserId(eq(userId))).thenReturn(List.of(standaloneWorkout));
        when(workoutEntryRepository.findDetailedHistoryByUserId(eq(userId), any(Pageable.class))).thenReturn(List.of());

        LiftSummaryService liftSummaryService = new LiftSummaryService(
                workoutEntryRepository,
                workoutTemplateRepository,
                bodyweightLogRepository
        );
        DashboardSummaryService service = new DashboardSummaryService(
                workoutEntryRepository,
                workoutTemplateRepository,
                splitRepository,
                liftSummaryService,
                programmeRepository
        );

        DashboardSummaryDTO summary = service.getSummary(userId);

        assertThat(summary.activeSplit()).isNull();
        assertThat(summary.nextWorkout()).isNotNull();
        assertThat(summary.nextWorkout().id()).isEqualTo(standaloneWorkoutId);
        assertThat(summary.nextWorkout().name()).isEqualTo("Leg Day");
        assertThat(summary.nextWorkout().previewExercises()).hasSize(1);
        assertThat(summary.nextWorkout().previewExercises().get(0).exerciseName()).isEqualTo("Squat");
    }

    private WorkoutTemplate workoutTemplate(UUID id, String name, String category, String exerciseName, int goalSets) {
        ExerciseDefinition definition = new ExerciseDefinition();
        definition.setUserId(UUID.randomUUID());
        definition.setExerciseName(exerciseName);
        definition.setNormalizedExerciseName(exerciseName.toLowerCase());
        definition.setNormalizedVariant("");
        definition.setMappingSource(com.louisfiges.workout.heatmap.MappingSource.MANUAL);
        ReflectionTestUtils.setField(definition, "id", UUID.randomUUID());

        ExerciseConfig config = new ExerciseConfig();
        config.setExerciseDefinition(definition);
        config.setGoalSets(goalSets);
        config.setGoalReps(5);
        config.setTargetRestSeconds(120);

        WorkoutTemplate workout = new WorkoutTemplate(name, UUID.randomUUID(), category, List.of(config));
        workout.setId(id);
        return workout;
    }

    private Programme programmeWithBlock() {
        Programme programme = new Programme();
        ReflectionTestUtils.setField(programme, "blocks", List.of(block()));
        return programme;
    }

    private Block block() {
        Block block = new Block();
        ReflectionTestUtils.setField(block, "name", "Strength");
        ReflectionTestUtils.setField(block, "durationWeeks", 4);
        ReflectionTestUtils.setField(block, "targetRpeMin", 7.0);
        ReflectionTestUtils.setField(block, "targetRpeMax", 9.0);
        ReflectionTestUtils.setField(block, "repRangeMin", 3);
        ReflectionTestUtils.setField(block, "repRangeMax", 6);
        ReflectionTestUtils.setField(block, "blockOrder", 0);
        return block;
    }

    private WorkoutEntry workoutEntry(
            WorkoutTemplate template,
            UUID userId,
            String exerciseName,
            String variant,
            double weight,
            int reps,
            Instant createdAt
    ) {
        WorkoutEntry entry = new WorkoutEntry();
        entry.setTemplate(template);
        entry.setUserId(userId);
        ReflectionTestUtils.setField(entry, "createdAt", createdAt);

        ExerciseEntry exercise = new ExerciseEntry();
        exercise.setExerciseDefinition(template.getExercises().get(0).getExerciseDefinition());
        exercise.setLoggedExerciseName(exerciseName);
        exercise.setLoggedVariant(variant);
        exercise.setGoalSets(1);
        exercise.setSets(List.of(new SetEntry(reps, weight, 8.0, null)));
        entry.setExercises(List.of(exercise));
        return entry;
    }
}