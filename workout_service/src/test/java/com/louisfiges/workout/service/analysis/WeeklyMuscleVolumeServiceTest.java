package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.analysis.types.ProgressionMode;
import com.louisfiges.workout.dao.periodisation.Block;
import com.louisfiges.workout.dao.periodisation.Programme;
import com.louisfiges.workout.dao.periodisation.Split;
import com.louisfiges.workout.dao.periodisation.SplitWorkoutAssignment;
import com.louisfiges.workout.dao.periodisation.Week;
import com.louisfiges.workout.dao.workout.ExerciseCatalogEquipment;
import com.louisfiges.workout.dao.workout.ExerciseCatalogForce;
import com.louisfiges.workout.dao.workout.ExerciseCatalogMechanics;
import com.louisfiges.workout.dao.workout.ExerciseCatalogMuscleGroup;
import com.louisfiges.workout.dao.workout.ExerciseCatalogUtility;
import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dao.workout.ExerciseEntry;
import com.louisfiges.workout.dao.workout.ExerciseInfo;
import com.louisfiges.workout.dao.workout.ExerciseInfoMuscle;
import com.louisfiges.workout.dao.workout.ExerciseInfoMuscleRole;
import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.dto.responses.heatmap.MuscleVolumeTrackingStatusDTO;
import com.louisfiges.workout.dto.responses.heatmap.WeeklyMuscleVolumeResponseDTO;
import com.louisfiges.workout.heatmap.MappingSource;
import com.louisfiges.workout.heatmap.MuscleGroupId;
import com.louisfiges.workout.periodisation.BlockType;
import com.louisfiges.workout.repository.SplitRepository;
import com.louisfiges.workout.repository.WorkoutEntryRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
@DisplayName("WeeklyMuscleVolumeService")
class WeeklyMuscleVolumeServiceTest {

    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000123");

    @Test
    @DisplayName("derives target sets from goalSets * sessionsPerWeek regardless of programme week presence")
    void derivesTargetSetsFromFrequency() {
        Fixture fixture = fixture(true);
        when(fixture.splitRepository.findActiveByUserIdWithWorkouts(USER_ID)).thenReturn(Optional.of(fixture.split));
        when(fixture.workoutEntryRepository.findDetailedHistoryByUserIdAndCreatedAtBetween(eq(USER_ID), any(), any()))
                .thenReturn(List.of(fixture.workoutEntry));

        WeeklyMuscleVolumeService service = new WeeklyMuscleVolumeService(
                fixture.splitRepository,
                fixture.workoutEntryRepository
        );

        WeeklyMuscleVolumeResponseDTO response = service.getDashboardWeeklyVolume(USER_ID);

        assertThat(response.coverage().totalExercises()).isEqualTo(1);
        assertThat(response.coverage().mappedExercises()).isEqualTo(1);
        assertThat(response.coverage().skippedExercises()).isEqualTo(0);
        assertThat(response.muscles()).extracting("muscleId").contains("chest", "triceps");

        assertThat(response.muscles())
                .filteredOn(muscle -> muscle.muscleId().equals("chest"))
                .hasSize(1);
        assertThat(response.muscles().stream().filter(m -> m.muscleId().equals("chest")).findFirst())
                .get()
                .satisfies(muscle -> {
                    // goalSets(4) * sessionsPerWeek(1) = 4.0
                    assertThat(muscle.targetSets()).isEqualTo(4.0);
                    assertThat(muscle.completedSets()).isEqualTo(2.0);
                    assertThat(muscle.templateContributions()).hasSize(1);
                    assertThat(muscle.templateContributions().get(0).liftContributions()).hasSize(1);
                    // block started 2 days ago → paceFactor ≈ 0.28, under 0.5 threshold
                    assertThat(muscle.trackingStatus()).isEqualTo(MuscleVolumeTrackingStatusDTO.ON_TRACK);
                });
    }

    @Test
    @DisplayName("uses exercise info muscles when the definition primary muscle is missing")
    void usesExerciseInfoMusclesWhenPrimaryMuscleIsMissing() {
        Fixture fixture = fixture(false);
        when(fixture.splitRepository.findActiveByUserIdWithWorkouts(USER_ID)).thenReturn(Optional.of(fixture.split));
        when(fixture.workoutEntryRepository.findDetailedHistoryByUserIdAndCreatedAtBetween(eq(USER_ID), any(), any()))
                .thenReturn(List.of(fixture.workoutEntry));

        WeeklyMuscleVolumeService service = new WeeklyMuscleVolumeService(
                fixture.splitRepository,
                fixture.workoutEntryRepository
        );

        WeeklyMuscleVolumeResponseDTO response = service.getDashboardWeeklyVolume(USER_ID);

        assertThat(response.coverage().mappedExercises()).isEqualTo(1);
        assertThat(response.muscles()).extracting("muscleId").contains("chest", "triceps");
    }

    @Test
    @DisplayName("returns an empty response when the user has no active split")
    void returnsEmptyResponseWithoutActiveSplit() {
        SplitRepository splitRepository = mock(SplitRepository.class);
        WorkoutEntryRepository workoutEntryRepository = mock(WorkoutEntryRepository.class);
        when(splitRepository.findActiveByUserIdWithWorkouts(USER_ID)).thenReturn(Optional.empty());

        WeeklyMuscleVolumeService service = new WeeklyMuscleVolumeService(splitRepository, workoutEntryRepository);

        WeeklyMuscleVolumeResponseDTO response = service.getDashboardWeeklyVolume(USER_ID);

        assertThat(response.coverage().totalExercises()).isZero();
        assertThat(response.coverage().mappedExercises()).isZero();
        assertThat(response.coverage().skippedExercises()).isZero();
        assertThat(response.muscles()).isEmpty();
        assertThat(response.unmappedExercises()).isEmpty();
    }

    @Test
    @DisplayName("marks muscle BEHIND when past midweek with insufficient completed sets")
    void marksMuscleAsBehindPastMidweek() {
        Fixture fixture = fixtureLateWeek();
        when(fixture.splitRepository.findActiveByUserIdWithWorkouts(USER_ID)).thenReturn(Optional.of(fixture.split));
        when(fixture.workoutEntryRepository.findDetailedHistoryByUserIdAndCreatedAtBetween(eq(USER_ID), any(), any()))
                .thenReturn(List.of());

        WeeklyMuscleVolumeService service = new WeeklyMuscleVolumeService(
                fixture.splitRepository,
                fixture.workoutEntryRepository
        );

        WeeklyMuscleVolumeResponseDTO response = service.getDashboardWeeklyVolume(USER_ID);

        assertThat(response.muscles().stream().filter(m -> m.muscleId().equals("chest")).findFirst())
                .get()
                .satisfies(muscle -> {
                    assertThat(muscle.targetSets()).isEqualTo(4.0);
                    assertThat(muscle.completedSets()).isEqualTo(0.0);
                    assertThat(muscle.trackingStatus()).isEqualTo(MuscleVolumeTrackingStatusDTO.BEHIND);
                });
    }

    @Test
    @DisplayName("marks muscle COMPLETED when completed sets meet or exceed target")
    void marksMuscleAsCompleted() {
        Fixture fixture = fixture(true);
        when(fixture.splitRepository.findActiveByUserIdWithWorkouts(USER_ID)).thenReturn(Optional.of(fixture.split));

        // 4 sets completed against a target of 4 → COMPLETED
        ExerciseEntry fullEntry = new ExerciseEntry(
                fixture.workoutEntry.getExercises().get(0).getExerciseDefinition(),
                "Bench Press",
                "Barbell",
                4,
                List.of(
                        new SetEntry(5, 100.0, 8.0, null),
                        new SetEntry(5, 100.0, 8.0, null),
                        new SetEntry(5, 100.0, 8.0, null),
                        new SetEntry(5, 100.0, 8.0, null)
                )
        );
        WorkoutTemplate template = fixture.workoutEntry.getTemplate();
        WorkoutEntry fullWorkout = new WorkoutEntry(template, USER_ID, List.of(fullEntry), null);
        ReflectionTestUtils.setField(fullWorkout, "createdAt", Instant.now().truncatedTo(ChronoUnit.SECONDS));

        when(fixture.workoutEntryRepository.findDetailedHistoryByUserIdAndCreatedAtBetween(eq(USER_ID), any(), any()))
                .thenReturn(List.of(fullWorkout));

        WeeklyMuscleVolumeService service = new WeeklyMuscleVolumeService(
                fixture.splitRepository,
                fixture.workoutEntryRepository
        );

        WeeklyMuscleVolumeResponseDTO response = service.getDashboardWeeklyVolume(USER_ID);

        assertThat(response.muscles().stream().filter(m -> m.muscleId().equals("chest")).findFirst())
                .get()
                .satisfies(muscle -> {
                    assertThat(muscle.targetSets()).isEqualTo(4.0);
                    assertThat(muscle.completedSets()).isEqualTo(4.0);
                    assertThat(muscle.trackingStatus()).isEqualTo(MuscleVolumeTrackingStatusDTO.COMPLETED);
                });
    }

    @Test
    @DisplayName("marks muscle AHEAD when completed sets exceed target")
    void marksMuscleAsAhead() {
        Fixture fixture = fixture(true);
        when(fixture.splitRepository.findActiveByUserIdWithWorkouts(USER_ID)).thenReturn(Optional.of(fixture.split));

        ExerciseEntry extraEntry = new ExerciseEntry(
                fixture.workoutEntry.getExercises().get(0).getExerciseDefinition(),
                "Bench Press",
                "Barbell",
                4,
                List.of(
                        new SetEntry(5, 100.0, 8.0, null),
                        new SetEntry(5, 100.0, 8.0, null),
                        new SetEntry(5, 100.0, 8.0, null),
                        new SetEntry(5, 100.0, 8.0, null),
                        new SetEntry(5, 100.0, 8.0, null)
                )
        );
        WorkoutTemplate template = fixture.workoutEntry.getTemplate();
        WorkoutEntry extraWorkout = new WorkoutEntry(template, USER_ID, List.of(extraEntry), null);
        ReflectionTestUtils.setField(extraWorkout, "createdAt", Instant.now().truncatedTo(ChronoUnit.SECONDS));

        when(fixture.workoutEntryRepository.findDetailedHistoryByUserIdAndCreatedAtBetween(eq(USER_ID), any(), any()))
                .thenReturn(List.of(extraWorkout));

        WeeklyMuscleVolumeService service = new WeeklyMuscleVolumeService(
                fixture.splitRepository,
                fixture.workoutEntryRepository
        );

        WeeklyMuscleVolumeResponseDTO response = service.getDashboardWeeklyVolume(USER_ID);

        assertThat(response.muscles().stream().filter(m -> m.muscleId().equals("chest")).findFirst())
                .get()
                .satisfies(muscle -> {
                    assertThat(muscle.completedSets()).isGreaterThan(muscle.targetSets());
                    assertThat(muscle.trackingStatus()).isEqualTo(MuscleVolumeTrackingStatusDTO.AHEAD);
                });
    }

    private Fixture fixture(boolean withProgrammeWeek) {
        SplitRepository splitRepository = mock(SplitRepository.class);
        WorkoutEntryRepository workoutEntryRepository = mock(WorkoutEntryRepository.class);

        WorkoutTemplate template = new WorkoutTemplate("Push Day", USER_ID, "Push", List.of());
        ReflectionTestUtils.setField(template, "id", UUID.fromString("00000000-0000-0000-0000-000000000222"));

        ExerciseDefinition definition = buildDefinition(withProgrammeWeek);

        ExerciseConfig exerciseConfig = new ExerciseConfig();
        exerciseConfig.setExerciseDefinition(definition);
        exerciseConfig.setGoalSets(4);
        exerciseConfig.setProgressionMode(ProgressionMode.WEIGHT_FIRST);
        exerciseConfig.setExerciseConfigId(UUID.fromString("00000000-0000-0000-0000-000000000333"));

        WorkoutTemplate detailedTemplate = new WorkoutTemplate("Push Day", USER_ID, "Push", List.of(exerciseConfig));
        ReflectionTestUtils.setField(detailedTemplate, "id", template.getId());

        Split split = new Split("Upper Lower", USER_ID, List.of(new SplitWorkoutAssignment(null, detailedTemplate, 1, 0)));
        split.setActive(true);
        ReflectionTestUtils.setField(split, "id", UUID.fromString("00000000-0000-0000-0000-000000000111"));

        if (withProgrammeWeek) {
            attachProgramme(split, 2);
        }

        ExerciseEntry exerciseEntry = new ExerciseEntry(
                definition,
                "Bench Press",
                "Barbell",
                4,
                List.of(
                        new SetEntry(5, 100.0, 8.0, null),
                        new SetEntry(5, 100.0, 8.0, null)
                )
        );
        WorkoutEntry workoutEntry = new WorkoutEntry(detailedTemplate, USER_ID, List.of(exerciseEntry), null);
        ReflectionTestUtils.setField(workoutEntry, "createdAt", Instant.now().truncatedTo(ChronoUnit.SECONDS));

        return new Fixture(splitRepository, workoutEntryRepository, split, workoutEntry);
    }

    // Block started 5 days ago → paceFactor ≈ 0.71, past 0.5 midweek threshold
    private Fixture fixtureLateWeek() {
        SplitRepository splitRepository = mock(SplitRepository.class);
        WorkoutEntryRepository workoutEntryRepository = mock(WorkoutEntryRepository.class);

        ExerciseDefinition definition = buildDefinition(true);

        ExerciseConfig exerciseConfig = new ExerciseConfig();
        exerciseConfig.setExerciseDefinition(definition);
        exerciseConfig.setGoalSets(4);
        exerciseConfig.setProgressionMode(ProgressionMode.WEIGHT_FIRST);
        exerciseConfig.setExerciseConfigId(UUID.fromString("00000000-0000-0000-0000-000000000333"));

        WorkoutTemplate detailedTemplate = new WorkoutTemplate("Push Day", USER_ID, "Push", List.of(exerciseConfig));
        ReflectionTestUtils.setField(detailedTemplate, "id", UUID.fromString("00000000-0000-0000-0000-000000000222"));

        Split split = new Split("Upper Lower", USER_ID, List.of(new SplitWorkoutAssignment(null, detailedTemplate, 1, 0)));
        split.setActive(true);
        ReflectionTestUtils.setField(split, "id", UUID.fromString("00000000-0000-0000-0000-000000000111"));

        attachProgramme(split, 5);

        ExerciseEntry exerciseEntry = new ExerciseEntry(
                definition,
                "Bench Press",
                "Barbell",
                4,
                List.of()
        );
        WorkoutEntry workoutEntry = new WorkoutEntry(detailedTemplate, USER_ID, List.of(exerciseEntry), null);
        ReflectionTestUtils.setField(workoutEntry, "createdAt", Instant.now().truncatedTo(ChronoUnit.SECONDS));

        return new Fixture(splitRepository, workoutEntryRepository, split, workoutEntry);
    }

    private ExerciseDefinition buildDefinition(boolean withPrimaryMuscle) {
        ExerciseDefinition definition = new ExerciseDefinition();
        definition.setUserId(USER_ID);
        definition.setExerciseName("Bench Press");
        definition.setVariant("Barbell");
        definition.setNormalizedExerciseName("bench press");
        definition.setNormalizedVariant("barbell");
        definition.setMappingSource(MappingSource.MANUAL);
        definition.setPrimaryMuscle(withPrimaryMuscle ? MuscleGroupId.chest : null);
        definition.setSecondaryMuscles(withPrimaryMuscle
                ? new LinkedHashSet<>(List.of(MuscleGroupId.triceps))
                : new LinkedHashSet<>());
        definition.setExerciseInfo(catalogInfo());
        return definition;
    }

    private void attachProgramme(Split split, int daysAgo) {
        Programme programme = new Programme();
        programme.setActive(true);
        programme.setStartDate(Instant.now().minus(daysAgo, ChronoUnit.DAYS));
        programme.setSplit(split);
        ReflectionTestUtils.setField(programme, "id", UUID.fromString("00000000-0000-0000-0000-000000000444"));

        Block block = new Block();
        block.setProgramme(programme);
        block.setName("Hypertrophy");
        block.setBlockType(BlockType.HYPERTROPHY);
        block.setProgressionStrategy(com.louisfiges.workout.analysis.types.ProgressionStrategy.WEIGHT_FIRST);
        block.setDurationWeeks(4);
        block.setTargetRpeMin(6.0);
        block.setTargetRpeMax(8.0);
        block.setRepRangeMin(6);
        block.setRepRangeMax(12);
        block.setBlockOrder(0);
        block.setStartDate(Instant.now().minus(daysAgo, ChronoUnit.DAYS));
        ReflectionTestUtils.setField(block, "id", UUID.fromString("00000000-0000-0000-0000-000000000555"));

        Week week = new Week();
        week.setBlock(block);
        week.setWeekNumber(1);
        week.setTargetSetsPerExercise(3);
        week.setDeload(false);
        ReflectionTestUtils.setField(week, "id", UUID.fromString("00000000-0000-0000-0000-000000000666"));

        block.getWeeks().add(week);
        programme.getBlocks().add(block);
        split.getProgrammes().add(programme);
    }

    private ExerciseInfo catalogInfo() {
        ExerciseInfo info = new ExerciseInfo();
        info.setName("Bench Press");
        info.setVariation("Barbell");
        info.setEquipment(new ExerciseCatalogEquipment("Barbell"));
        info.setUtility(new ExerciseCatalogUtility("Basic"));
        info.setMechanics(new ExerciseCatalogMechanics("Compound"));
        info.setForce(new ExerciseCatalogForce("Push"));
        info.setMainMuscle(new ExerciseCatalogMuscleGroup("Chest"));
        info.setMuscles(new LinkedHashSet<>(List.of(
                new ExerciseInfoMuscle(info, ExerciseInfoMuscleRole.TARGET, new ExerciseCatalogMuscleGroup("Chest")),
                new ExerciseInfoMuscle(info, ExerciseInfoMuscleRole.SECONDARY, new ExerciseCatalogMuscleGroup("Triceps"))
        )));
        return info;
    }

    private record Fixture(
            SplitRepository splitRepository,
            WorkoutEntryRepository workoutEntryRepository,
            Split split,
            WorkoutEntry workoutEntry
    ) {}
}