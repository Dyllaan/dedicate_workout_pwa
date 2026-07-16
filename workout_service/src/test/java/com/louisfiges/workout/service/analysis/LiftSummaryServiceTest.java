package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.dao.core.BodyweightLog;
import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dao.workout.ExerciseEntry;
import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.dto.responses.dashboard.DashboardTopLiftDTO;
import com.louisfiges.workout.heatmap.MappingSource;
import com.louisfiges.workout.repository.BodyweightLogRepository;
import com.louisfiges.workout.repository.WorkoutEntryRepository;
import com.louisfiges.workout.repository.WorkoutTemplateRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
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
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("LiftSummaryService")
class LiftSummaryServiceTest {

    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000101");
    private static final UUID PUSH_TEMPLATE_ID = UUID.fromString("00000000-0000-0000-0000-000000000202");
    private static final UUID PULL_TEMPLATE_ID = UUID.fromString("00000000-0000-0000-0000-000000000303");
    private static final UUID BENCH_DEFINITION_ID = UUID.fromString("00000000-0000-0000-0000-000000000404");
    private static final UUID ALT_BENCH_DEFINITION_ID = UUID.fromString("00000000-0000-0000-0000-000000000505");

    @Mock
    private WorkoutEntryRepository workoutEntryRepository;

    @Mock
    private WorkoutTemplateRepository workoutTemplateRepository;

    @Mock
    private BodyweightLogRepository bodyweightLogRepository;

    @Test
    @DisplayName("returns the overall top lift summary using the same session grouping as the dashboard")
    void returnsOverallLiftSummary() {
        LiftSummaryService service = new LiftSummaryService(workoutEntryRepository, workoutTemplateRepository, bodyweightLogRepository);

        WorkoutTemplate pushTemplate = template(
                PUSH_TEMPLATE_ID,
                "Push Day",
                focusedConfig("Bench Press", "Barbell", BENCH_DEFINITION_ID, false)
        );
        WorkoutTemplate pullTemplate = template(
                PULL_TEMPLATE_ID,
                "Pull Day",
                focusedConfig("Bench Press", "Barbell", ALT_BENCH_DEFINITION_ID, false)
        );

        WorkoutEntry benchEntry1 = entry(pushTemplate, USER_ID, "Bench Press", "Barbell", BENCH_DEFINITION_ID, 100.0, 5, Instant.parse("2026-05-01T10:00:00Z"));
        WorkoutEntry benchEntry2 = entry(pushTemplate, USER_ID, "Bench Press", "Barbell", BENCH_DEFINITION_ID, 120.0, 3, Instant.parse("2026-05-15T10:00:00Z"));
        WorkoutEntry altBenchEntry = entry(pullTemplate, USER_ID, "Bench Press", "Barbell", ALT_BENCH_DEFINITION_ID, 80.0, 5, Instant.parse("2026-05-20T10:00:00Z"));

        when(workoutEntryRepository.findDetailedHistoryByUserIdAndCreatedAtBetween(eq(USER_ID), any(), any()))
                .thenReturn(List.of(altBenchEntry, benchEntry2, benchEntry1));
        when(bodyweightLogRepository.findFirstByUserIdAndLoggedAtLessThanEqualOrderByLoggedAtDesc(eq(USER_ID), any(LocalDate.class)))
                .thenReturn(Optional.of(new BodyweightLog(USER_ID, BigDecimal.valueOf(80), LocalDate.of(2026, 5, 15), null)));

        DashboardTopLiftDTO summary = service.getOverallLiftSummary(USER_ID).orElseThrow();

        assertThat(summary.exerciseDefinitionId()).isEqualTo(BENCH_DEFINITION_ID);
        assertThat(summary.exerciseName()).isEqualTo("Bench Press");
        assertThat(summary.variant()).isEqualTo("Barbell");
        assertThat(summary.sessionCount()).isEqualTo(2);
        assertThat(summary.personalBestKg()).isEqualTo(120.0);
        assertThat(summary.improvementKg()).isEqualTo(20.0);
        assertThat(summary.personalBestTopSetPerformedAt()).isEqualTo(Instant.parse("2026-05-15T10:00:00Z"));
        assertThat(summary.improvementBaselineTopSetPerformedAt()).isEqualTo(Instant.parse("2026-05-01T10:00:00Z"));
        assertThat(summary.loadBodyweightRatio()).isEqualTo(1.5);
        assertThat(summary.estimatedOneRepMaxBodyweightRatio()).isEqualTo(1.64);
    }

    @Test
    @DisplayName("returns the previous occurrence best set alongside the all-time best set")
    void returnsPreviousOccurrenceBestSetAlongsideAllTimeBestSet() {
        LiftSummaryService service = new LiftSummaryService(workoutEntryRepository, workoutTemplateRepository, bodyweightLogRepository);

        WorkoutTemplate pushTemplate = template(
                PUSH_TEMPLATE_ID,
                "Push Day",
                focusedConfig("Bench Press", "Barbell", BENCH_DEFINITION_ID, false)
        );

        WorkoutEntry olderHeavyEntry = entryWithSets(
                pushTemplate,
                USER_ID,
                "Bench Press",
                "Barbell",
                BENCH_DEFINITION_ID,
                Instant.parse("2026-05-01T10:00:00Z"),
                List.of(
                        new SetEntry(5, 100.0, 8.0, null)
                )
        );
        WorkoutEntry previousOccurrenceEntry = entryWithSets(
                pushTemplate,
                USER_ID,
                "Bench Press",
                "Barbell",
                BENCH_DEFINITION_ID,
                Instant.parse("2026-05-15T10:00:00Z"),
                List.of(
                        new SetEntry(3, 120.0, 8.5, null)
                )
        );
        WorkoutEntry latestOccurrenceEntry = entryWithSets(
                pushTemplate,
                USER_ID,
                "Bench Press",
                "Barbell",
                BENCH_DEFINITION_ID,
                Instant.parse("2026-05-20T10:00:00Z"),
                List.of(
                        new SetEntry(1, 140.0, 8.0, null)
                )
        );

        when(workoutEntryRepository.findDetailedHistoryByUserIdAndCreatedAtBetween(eq(USER_ID), any(), any()))
                .thenReturn(List.of(latestOccurrenceEntry, previousOccurrenceEntry, olderHeavyEntry));
        when(bodyweightLogRepository.findFirstByUserIdAndLoggedAtLessThanEqualOrderByLoggedAtDesc(eq(USER_ID), any(LocalDate.class)))
                .thenReturn(Optional.of(new BodyweightLog(USER_ID, BigDecimal.valueOf(80), LocalDate.of(2026, 5, 15), null)));

        DashboardTopLiftDTO summary = service.getOverallLiftSummary(USER_ID).orElseThrow();

        assertThat(summary.topSetWeightKg()).isEqualTo(140.0);
        assertThat(summary.topSetReps()).isEqualTo(1);
        assertThat(summary.personalBestTopSetPerformedAt()).isEqualTo(Instant.parse("2026-05-20T10:00:00Z"));
        assertThat(summary.improvementBaselineTopSetPerformedAt()).isEqualTo(Instant.parse("2026-05-01T10:00:00Z"));
        assertThat(summary.previousTopSetWeightKg()).isEqualTo(120.0);
        assertThat(summary.previousTopSetReps()).isEqualTo(3);
        assertThat(summary.previousTopSetPerformedAt()).isEqualTo(Instant.parse("2026-05-15T10:00:00Z"));
    }

    @Test
    @DisplayName("uses the latest occurrence for recent set details even when an older session is heavier")
    void usesLatestOccurrenceForRecentSetDetailsWhenOlderSessionIsHeavier() {
        LiftSummaryService service = new LiftSummaryService(workoutEntryRepository, workoutTemplateRepository, bodyweightLogRepository);

        WorkoutTemplate pullTemplate = template(
                PULL_TEMPLATE_ID,
                "Pull Day",
                focusedConfig("Low Row", "Cable", ALT_BENCH_DEFINITION_ID, false)
        );

        WorkoutEntry olderHeavyEntry = entryWithSets(
                pullTemplate,
                USER_ID,
                "Low Row",
                "Cable",
                ALT_BENCH_DEFINITION_ID,
                Instant.parse("2026-05-10T10:00:00Z"),
                List.of(
                        new SetEntry(3, 170.0, 9.0, null)
                )
        );
        WorkoutEntry latestLighterEntry = entryWithSets(
                pullTemplate,
                USER_ID,
                "Low Row",
                "Cable",
                ALT_BENCH_DEFINITION_ID,
                Instant.parse("2026-05-24T10:00:00Z"),
                List.of(
                        new SetEntry(5, 150.0, 8.0, null)
                )
        );

        when(workoutEntryRepository.findDetailedHistoryByUserIdAndCreatedAtBetween(eq(USER_ID), any(), any()))
                .thenReturn(List.of(latestLighterEntry, olderHeavyEntry));
        when(bodyweightLogRepository.findFirstByUserIdAndLoggedAtLessThanEqualOrderByLoggedAtDesc(eq(USER_ID), any(LocalDate.class)))
                .thenAnswer(invocation -> {
                    LocalDate loggedAt = invocation.getArgument(1);
                    return Optional.of(new BodyweightLog(USER_ID, BigDecimal.valueOf(75), loggedAt, null));
                });

        DashboardTopLiftDTO summary = service.getOverallLiftSummary(USER_ID).orElseThrow();

        assertThat(summary.personalBestKg()).isEqualTo(170.0);
        assertThat(summary.topSetWeightKg()).isEqualTo(170.0);
        assertThat(summary.topSetReps()).isEqualTo(3);
        assertThat(summary.estimatedOneRepMaxKg()).isEqualTo(185.6);
        assertThat(summary.bodyweightKg()).isEqualTo(75.0);
        assertThat(summary.bodyweightLoggedAt()).isEqualTo(LocalDate.of(2026, 5, 10));
        assertThat(summary.loadBodyweightRatio()).isEqualTo(2.27);
        assertThat(summary.estimatedOneRepMaxBodyweightRatio()).isEqualTo(2.47);
        assertThat(summary.mostRecentTopSetWeightKg()).isEqualTo(150.0);
        assertThat(summary.mostRecentTopSetReps()).isEqualTo(5);
        assertThat(summary.mostRecentEstimatedOneRepMaxKg()).isEqualTo(173.3);
        assertThat(summary.mostRecentBodyweightKg()).isEqualTo(75.0);
        assertThat(summary.mostRecentBodyweightLoggedAt()).isEqualTo(LocalDate.of(2026, 5, 24));
        assertThat(summary.mostRecentLoadBodyweightRatio()).isEqualTo(2.0);
        assertThat(summary.mostRecentEstimatedOneRepMaxBodyweightRatio()).isEqualTo(2.31);
        assertThat(summary.mostRecentTopSetPerformedAt()).isEqualTo(Instant.parse("2026-05-24T10:00:00Z"));
        assertThat(summary.previousTopSetWeightKg()).isEqualTo(170.0);
        assertThat(summary.previousTopSetReps()).isEqualTo(3);
        assertThat(summary.previousEstimatedOneRepMaxKg()).isEqualTo(185.6);
        assertThat(summary.previousTopSetPerformedAt()).isEqualTo(Instant.parse("2026-05-10T10:00:00Z"));
    }

    @Test
    @DisplayName("returns null previous set fields when the lift only appears once")
    void returnsNullPreviousSetFieldsWhenLiftAppearsOnce() {
        LiftSummaryService service = new LiftSummaryService(workoutEntryRepository, workoutTemplateRepository, bodyweightLogRepository);

        WorkoutTemplate pushTemplate = template(
                PUSH_TEMPLATE_ID,
                "Push Day",
                focusedConfig("Bench Press", "Barbell", BENCH_DEFINITION_ID, false)
        );

        WorkoutEntry onlyEntry = entryWithSets(
                pushTemplate,
                USER_ID,
                "Bench Press",
                "Barbell",
                BENCH_DEFINITION_ID,
                Instant.parse("2026-05-15T10:00:00Z"),
                List.of(
                        new SetEntry(3, 120.0, 8.5, null)
                )
        );

        when(workoutEntryRepository.findDetailedHistoryByUserIdAndCreatedAtBetween(eq(USER_ID), any(), any()))
                .thenReturn(List.of(onlyEntry));

        DashboardTopLiftDTO summary = service.getOverallLiftSummary(USER_ID).orElseThrow();

        assertThat(summary.previousTopSetWeightKg()).isNull();
        assertThat(summary.previousTopSetReps()).isNull();
        assertThat(summary.previousEstimatedOneRepMaxKg()).isNull();
        assertThat(summary.previousTopSetPerformedAt()).isNull();
    }

    @Test
    @DisplayName("returns the focused lift summary for the template-focused exercise only")
    void returnsTemplateFocusedLiftSummary() {
        LiftSummaryService service = new LiftSummaryService(workoutEntryRepository, workoutTemplateRepository, bodyweightLogRepository);

        WorkoutTemplate pushTemplate = template(
                PUSH_TEMPLATE_ID,
                "Push Day",
                focusedConfig("Bench Press", "Barbell", BENCH_DEFINITION_ID, true)
        );

        WorkoutEntry benchEntry1 = entry(pushTemplate, USER_ID, "Bench Press", "Barbell", BENCH_DEFINITION_ID, 100.0, 5, Instant.parse("2026-05-01T10:00:00Z"));
        WorkoutEntry benchEntry2 = entry(pushTemplate, USER_ID, "Bench Press", "Barbell", BENCH_DEFINITION_ID, 120.0, 3, Instant.parse("2026-05-15T10:00:00Z"));

        when(workoutTemplateRepository.findByIdAndUserId(eq(PUSH_TEMPLATE_ID), eq(USER_ID))).thenReturn(Optional.of(pushTemplate));
        when(workoutEntryRepository.findDetailedHistoryByTemplateIdAndUserId(eq(PUSH_TEMPLATE_ID), eq(USER_ID)))
                .thenReturn(List.of(benchEntry2, benchEntry1));
        when(bodyweightLogRepository.findFirstByUserIdAndLoggedAtLessThanEqualOrderByLoggedAtDesc(eq(USER_ID), any(LocalDate.class)))
                .thenReturn(Optional.of(new BodyweightLog(USER_ID, BigDecimal.valueOf(80), LocalDate.of(2026, 5, 15), null)));

        DashboardTopLiftDTO summary = service.getTemplateFocusedLiftSummary(USER_ID, PUSH_TEMPLATE_ID).orElseThrow();

        assertThat(summary.exerciseDefinitionId()).isEqualTo(BENCH_DEFINITION_ID);
        assertThat(summary.sessionCount()).isEqualTo(2);
        assertThat(summary.personalBestKg()).isEqualTo(120.0);
        assertThat(summary.loadBodyweightRatio()).isEqualTo(1.5);
    }

    @Test
    @DisplayName("falls back to the latest bodyweight log when no earlier weigh-in exists")
    void fallsBackToLatestBodyweightLog() {
        LiftSummaryService service = new LiftSummaryService(workoutEntryRepository, workoutTemplateRepository, bodyweightLogRepository);

        WorkoutTemplate pushTemplate = template(
                PUSH_TEMPLATE_ID,
                "Push Day",
                focusedConfig("Bench Press", "Barbell", BENCH_DEFINITION_ID, true)
        );

        WorkoutEntry benchEntry1 = entry(pushTemplate, USER_ID, "Bench Press", "Barbell", BENCH_DEFINITION_ID, 100.0, 5, Instant.parse("2026-05-01T10:00:00Z"));
        WorkoutEntry benchEntry2 = entry(pushTemplate, USER_ID, "Bench Press", "Barbell", BENCH_DEFINITION_ID, 120.0, 3, Instant.parse("2026-05-15T10:00:00Z"));

        when(workoutTemplateRepository.findByIdAndUserId(eq(PUSH_TEMPLATE_ID), eq(USER_ID))).thenReturn(Optional.of(pushTemplate));
        when(workoutEntryRepository.findDetailedHistoryByTemplateIdAndUserId(eq(PUSH_TEMPLATE_ID), eq(USER_ID)))
                .thenReturn(List.of(benchEntry2, benchEntry1));
        when(bodyweightLogRepository.findFirstByUserIdAndLoggedAtLessThanEqualOrderByLoggedAtDesc(eq(USER_ID), any(LocalDate.class)))
                .thenReturn(Optional.empty());
        when(bodyweightLogRepository.findByUserIdOrderByLoggedAtDesc(eq(USER_ID), any()))
                .thenReturn(List.of(new BodyweightLog(USER_ID, BigDecimal.valueOf(82), LocalDate.of(2026, 5, 20), null)));

        DashboardTopLiftDTO summary = service.getTemplateFocusedLiftSummary(USER_ID, PUSH_TEMPLATE_ID).orElseThrow();

        assertThat(summary.bodyweightKg()).isEqualTo(82.0);
        assertThat(summary.bodyweightLoggedAt()).isEqualTo(LocalDate.of(2026, 5, 20));
        assertThat(summary.loadBodyweightRatio()).isEqualTo(1.46);
        assertThat(summary.estimatedOneRepMaxBodyweightRatio()).isEqualTo(1.6);
    }

    @Test
    @DisplayName("falls back to the best performing lift when a template has no focused exercise")
    void fallsBackToTheBestPerformingLiftWhenTemplateHasNoFocusedExercise() {
        LiftSummaryService service = new LiftSummaryService(workoutEntryRepository, workoutTemplateRepository, bodyweightLogRepository);

        WorkoutTemplate pushTemplate = template(
                PUSH_TEMPLATE_ID,
                "Push Day",
                focusedConfig("Bench Press", "Barbell", BENCH_DEFINITION_ID, false),
                focusedConfig("Incline Press", "Barbell", ALT_BENCH_DEFINITION_ID, false)
        );
        when(workoutTemplateRepository.findByIdAndUserId(eq(PUSH_TEMPLATE_ID), eq(USER_ID))).thenReturn(Optional.of(pushTemplate));
        when(workoutEntryRepository.findDetailedHistoryByTemplateIdAndUserId(eq(PUSH_TEMPLATE_ID), eq(USER_ID))).thenReturn(List.of(
                entry(pushTemplate, USER_ID, "Incline Press", "Barbell", ALT_BENCH_DEFINITION_ID, 90.0, 5, Instant.parse("2026-05-20T10:00:00Z")),
                entry(pushTemplate, USER_ID, "Incline Press", "Barbell", ALT_BENCH_DEFINITION_ID, 95.0, 5, Instant.parse("2026-05-27T10:00:00Z")),
                entry(pushTemplate, USER_ID, "Bench Press", "Barbell", BENCH_DEFINITION_ID, 100.0, 5, Instant.parse("2026-05-01T10:00:00Z"))
        ));

        DashboardTopLiftDTO summary = service.getTemplateFocusedLiftSummary(USER_ID, PUSH_TEMPLATE_ID).orElseThrow();

        assertThat(summary.exerciseDefinitionId()).isEqualTo(ALT_BENCH_DEFINITION_ID);
        assertThat(summary.exerciseName()).isEqualTo("Incline Press");
        assertThat(summary.sessionCount()).isEqualTo(2);
        assertThat(summary.personalBestKg()).isEqualTo(95.0);
    }

    @Test
    @DisplayName("returns empty when the focused exercise has no qualifying history")
    void returnsEmptyWhenFocusedExerciseHasNoHistory() {
        LiftSummaryService service = new LiftSummaryService(workoutEntryRepository, workoutTemplateRepository, bodyweightLogRepository);

        WorkoutTemplate pushTemplate = template(
                PUSH_TEMPLATE_ID,
                "Push Day",
                focusedConfig("Bench Press", "Barbell", BENCH_DEFINITION_ID, true)
        );
        when(workoutTemplateRepository.findByIdAndUserId(eq(PUSH_TEMPLATE_ID), eq(USER_ID))).thenReturn(Optional.of(pushTemplate));
        when(workoutEntryRepository.findDetailedHistoryByTemplateIdAndUserId(eq(PUSH_TEMPLATE_ID), eq(USER_ID))).thenReturn(List.of());

        assertThat(service.getTemplateFocusedLiftSummary(USER_ID, PUSH_TEMPLATE_ID)).isEmpty();
    }

    @Test
    @DisplayName("breaks ties by template order when session counts match")
    void breaksTiesByTemplateOrderWhenSessionCountsMatch() {
        LiftSummaryService service = new LiftSummaryService(workoutEntryRepository, workoutTemplateRepository, bodyweightLogRepository);

        WorkoutTemplate pushTemplate = template(
                PUSH_TEMPLATE_ID,
                "Push Day",
                focusedConfig("Squat", "Barbell", ALT_BENCH_DEFINITION_ID, false),
                focusedConfig("Bench Press", "Barbell", BENCH_DEFINITION_ID, false)
        );
        when(workoutTemplateRepository.findByIdAndUserId(eq(PUSH_TEMPLATE_ID), eq(USER_ID))).thenReturn(Optional.of(pushTemplate));
        when(workoutEntryRepository.findDetailedHistoryByTemplateIdAndUserId(eq(PUSH_TEMPLATE_ID), eq(USER_ID))).thenReturn(List.of(
                entry(pushTemplate, USER_ID, "Bench Press", "Barbell", BENCH_DEFINITION_ID, 100.0, 5, Instant.parse("2026-05-03T10:00:00Z")),
                entry(pushTemplate, USER_ID, "Bench Press", "Barbell", BENCH_DEFINITION_ID, 102.5, 5, Instant.parse("2026-05-17T10:00:00Z")),
                entry(pushTemplate, USER_ID, "Squat", "Barbell", ALT_BENCH_DEFINITION_ID, 140.0, 5, Instant.parse("2026-05-01T10:00:00Z")),
                entry(pushTemplate, USER_ID, "Squat", "Barbell", ALT_BENCH_DEFINITION_ID, 142.5, 5, Instant.parse("2026-05-15T10:00:00Z"))
        ));

        DashboardTopLiftDTO summary = service.getTemplateFocusedLiftSummary(USER_ID, PUSH_TEMPLATE_ID).orElseThrow();

        assertThat(summary.exerciseDefinitionId()).isEqualTo(ALT_BENCH_DEFINITION_ID);
        assertThat(summary.exerciseName()).isEqualTo("Squat");
        assertThat(summary.sessionCount()).isEqualTo(2);
    }

    private WorkoutTemplate template(UUID id, String name, ExerciseConfig... exerciseConfigs) {
        for (int i = 0; i < exerciseConfigs.length; i++) {
            exerciseConfigs[i].setExerciseOrder(i);
        }
        WorkoutTemplate template = new WorkoutTemplate(name, USER_ID, "Push", List.of(exerciseConfigs));
        template.setId(id);
        return template;
    }

    private ExerciseConfig focusedConfig(String exerciseName, String variant, UUID definitionId, boolean focus) {
        ExerciseDefinition definition = new ExerciseDefinition();
        definition.setUserId(USER_ID);
        definition.setExerciseName(exerciseName);
        definition.setVariant(variant);
        definition.setMappingSource(MappingSource.MANUAL);
        ReflectionTestUtils.setField(definition, "id", definitionId);

        ExerciseConfig config = new ExerciseConfig();
        config.setExerciseDefinition(definition);
        config.setGoalSets(3);
        config.setGoalReps(5);
        config.setFocus(focus);
        return config;
    }

    private WorkoutEntry entry(
            WorkoutTemplate template,
            UUID userId,
            String exerciseName,
            String variant,
            UUID definitionId,
            double weight,
            int reps,
            Instant createdAt
    ) {
        WorkoutEntry entry = new WorkoutEntry();
        entry.setTemplate(template);
        entry.setUserId(userId);
        ReflectionTestUtils.setField(entry, "createdAt", createdAt);

        ExerciseDefinition definition = template.getExercises().stream()
                .map(ExerciseConfig::getExerciseDefinition)
                .filter(candidate -> candidate != null && definitionId.equals(candidate.getId()))
                .findFirst()
                .orElse(template.getExercises().get(0).getExerciseDefinition());

        ReflectionTestUtils.setField(definition, "id", definitionId);

        ExerciseEntry exercise = new ExerciseEntry();
        exercise.setExerciseDefinition(definition);
        exercise.setLoggedExerciseName(exerciseName);
        exercise.setLoggedVariant(variant);
        exercise.setGoalSets(3);
        exercise.setSets(List.of(new SetEntry(reps, weight, 8.0, null)));
        entry.setExercises(List.of(exercise));
        return entry;
    }

    private WorkoutEntry entryWithSets(
            WorkoutTemplate template,
            UUID userId,
            String exerciseName,
            String variant,
            UUID definitionId,
            Instant createdAt,
            List<SetEntry> sets
    ) {
        WorkoutEntry entry = new WorkoutEntry();
        entry.setTemplate(template);
        entry.setUserId(userId);
        ReflectionTestUtils.setField(entry, "createdAt", createdAt);

        ExerciseDefinition definition = template.getExercises().stream()
                .map(ExerciseConfig::getExerciseDefinition)
                .filter(candidate -> candidate != null && definitionId.equals(candidate.getId()))
                .findFirst()
                .orElse(template.getExercises().get(0).getExerciseDefinition());

        ReflectionTestUtils.setField(definition, "id", definitionId);

        ExerciseEntry exercise = new ExerciseEntry();
        exercise.setExerciseDefinition(definition);
        exercise.setLoggedExerciseName(exerciseName);
        exercise.setLoggedVariant(variant);
        exercise.setGoalSets(3);
        exercise.setSets(sets);
        entry.setExercises(List.of(exercise));
        return entry;
    }
}
