package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.analysis.types.BlockContext;
import com.louisfiges.workout.analysis.types.ProgressionStrategy;
import com.louisfiges.workout.analysis.SetRole;
import com.louisfiges.workout.dao.workout.ExerciseCatalogEquipment;
import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dao.workout.ExerciseInfo;
import com.louisfiges.workout.dao.workout.ExerciseEntry;
import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.dto.responses.exercisehistory.ExerciseHistoryGroupDTO;
import com.louisfiges.workout.dto.responses.exercisehistory.ExerciseHistoryResponseDTO;
import com.louisfiges.workout.dto.responses.exercisehistory.ExerciseHistorySessionDTO;
import com.louisfiges.workout.dto.responses.exercisehistory.ExerciseHistorySetDTO;
import com.louisfiges.workout.exception.exceptions.BadRequestException;
import com.louisfiges.workout.exception.exceptions.ResourceNotFoundException;
import com.louisfiges.workout.repository.WorkoutEntryRepository;
import com.louisfiges.workout.repository.WorkoutTemplateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TemplateAnalysisInputResolverTest {

    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000222");
    private static final UUID TEMPLATE_ID = UUID.fromString("00000000-0000-0000-0000-000000000333");
    private static final UUID DEFINITION_ID = UUID.fromString("00000000-0000-0000-0000-000000000444");

    @Mock
    private WorkoutTemplateRepository workoutTemplateRepository;

    @Mock
    private WorkoutEntryRepository workoutEntryRepository;

    @Mock
    private ActiveBlockContextResolver activeBlockContextResolver;

    private TemplateAnalysisInputResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new TemplateAnalysisInputResolver(
                workoutTemplateRepository,
                workoutEntryRepository,
                activeBlockContextResolver
        );
    }

    @Test
    void resolvesFocusedTemplateInputsFromHistoryAndBlockContext() {
        WorkoutTemplate template = template(true);
        ActiveBlockContextResolver.ResolvedActiveBlockContext blockContext = new ActiveBlockContextResolver.ResolvedActiveBlockContext(
                new BlockContext(null, ProgressionStrategy.WEIGHT_FIRST, 2, 4, false, 7.0, 9.0, 4, 6, 3),
                null
        );

        when(workoutTemplateRepository.findByIdAndUserId(eq(TEMPLATE_ID), eq(USER_ID))).thenReturn(Optional.of(template));
        when(workoutEntryRepository.findDetailedHistoryByTemplateIdAndUserId(eq(TEMPLATE_ID), eq(USER_ID))).thenReturn(List.of(workoutEntry(template)));
        when(activeBlockContextResolver.resolve(eq(USER_ID))).thenReturn(blockContext);

        TemplateAnalysisInputResolver.ResolvedTemplateAnalysisInput input = resolver.resolve(USER_ID, TEMPLATE_ID);

        assertThat(input.templateId()).isEqualTo(TEMPLATE_ID);
        assertThat(input.exerciseDefinitionId()).isEqualTo(DEFINITION_ID);
        assertThat(input.history().exerciseDefinitionId()).isEqualTo(DEFINITION_ID);
        assertThat(input.history().exerciseName()).isEqualTo("Bench Press");
        assertThat(input.history().historyGroups()).hasSize(1);
        assertThat(input.history().historyGroups().get(0).sessions()).hasSize(1);
        assertThat(input.plannedWeight()).isEqualTo(100.0);
        assertThat(input.plannedReps()).isEqualTo(5);
        assertThat(input.targetRpe()).isEqualTo(9.0);
        assertThat(input.plateIncrementKg()).isEqualTo(1.25);
        assertThat(input.activeBlockContext()).isEqualTo(blockContext);
    }

    @Test
    void resolvesHistoryInChronologicalOrderWhileStillUsingTheLatestSessionForPlanning() {
        WorkoutTemplate template = template(true);
        ActiveBlockContextResolver.ResolvedActiveBlockContext blockContext = new ActiveBlockContextResolver.ResolvedActiveBlockContext(
                new BlockContext(null, ProgressionStrategy.WEIGHT_FIRST, 2, 4, false, 7.0, 9.0, 4, 6, 3),
                null
        );

        WorkoutEntry newestEntry = workoutEntry(template, "2026-07-11T09:00:00Z", 110.0, 8.3, 5);
        WorkoutEntry middleEntry = workoutEntry(template, "2026-07-10T12:00:00Z", 100.0, 7.6, 5);
        WorkoutEntry oldestEntry = workoutEntry(template, "2026-07-10T10:00:00Z", 95.0, 7.2, 5);

        when(workoutTemplateRepository.findByIdAndUserId(eq(TEMPLATE_ID), eq(USER_ID))).thenReturn(Optional.of(template));
        when(workoutEntryRepository.findDetailedHistoryByTemplateIdAndUserId(eq(TEMPLATE_ID), eq(USER_ID)))
                .thenReturn(List.of(newestEntry, middleEntry, oldestEntry));
        when(activeBlockContextResolver.resolve(eq(USER_ID))).thenReturn(blockContext);

        TemplateAnalysisInputResolver.ResolvedTemplateAnalysisInput input = resolver.resolve(USER_ID, TEMPLATE_ID);

        assertThat(input.plannedWeight()).isEqualTo(110.0);
        assertThat(input.history().historyGroups()).hasSize(2);
        assertThat(input.history().historyGroups().get(0).date()).isEqualTo(LocalDate.of(2026, 7, 10));
        assertThat(input.history().historyGroups().get(0).groupOrder()).isEqualTo(1);
        assertThat(input.history().historyGroups().get(0).sessions()).hasSize(2);
        assertThat(input.history().historyGroups().get(0).sessions().get(0).performedAt()).isEqualTo(Instant.parse("2026-07-10T10:00:00Z"));
        assertThat(input.history().historyGroups().get(0).sessions().get(0).sessionOrder()).isEqualTo(1);
        assertThat(input.history().historyGroups().get(0).sessions().get(1).performedAt()).isEqualTo(Instant.parse("2026-07-10T12:00:00Z"));
        assertThat(input.history().historyGroups().get(0).sessions().get(1).sessionOrder()).isEqualTo(2);
        assertThat(input.history().historyGroups().get(1).date()).isEqualTo(LocalDate.of(2026, 7, 11));
        assertThat(input.history().historyGroups().get(1).groupOrder()).isEqualTo(2);
        assertThat(input.history().historyGroups().get(1).sessions()).hasSize(1);
        assertThat(input.history().historyGroups().get(1).sessions().get(0).performedAt()).isEqualTo(Instant.parse("2026-07-11T09:00:00Z"));
        assertThat(input.history().historyGroups().get(1).sessions().get(0).sessionOrder()).isEqualTo(1);
        assertThat(input.activeBlockContext()).isEqualTo(blockContext);
    }

    @Test
    void filtersHistoryBeforeApplyingTheRequestedLimit() {
        WorkoutTemplate template = template(true);
        ActiveBlockContextResolver.ResolvedActiveBlockContext blockContext = new ActiveBlockContextResolver.ResolvedActiveBlockContext(
                new BlockContext(null, ProgressionStrategy.WEIGHT_FIRST, 2, 4, false, 7.0, 9.0, 4, 6, 3),
                null
        );

        WorkoutEntry julyEntry = workoutEntry(template, "2026-07-15T09:00:00Z", 110.0, 8.3, 5);
        WorkoutEntry juneEntry = workoutEntry(template, "2026-06-20T09:00:00Z", 100.0, 7.7, 5);
        WorkoutEntry marchEntry = workoutEntry(template, "2026-03-15T09:00:00Z", 90.0, 7.0, 5);

        when(workoutTemplateRepository.findByIdAndUserId(eq(TEMPLATE_ID), eq(USER_ID))).thenReturn(Optional.of(template));
        when(workoutEntryRepository.findDetailedHistoryByTemplateIdAndUserId(eq(TEMPLATE_ID), eq(USER_ID)))
                .thenReturn(List.of(julyEntry, juneEntry, marchEntry));
        when(activeBlockContextResolver.resolve(eq(USER_ID))).thenReturn(blockContext);

        TemplateAnalysisInputResolver.ResolvedTemplateAnalysisInput input = resolver.resolve(
                USER_ID,
                TEMPLATE_ID,
                1,
                LocalDate.parse("2026-06-01"),
                LocalDate.parse("2026-06-30")
        );

        assertThat(input.history().historyGroups()).hasSize(1);
        assertThat(input.history().historyGroups().get(0).date()).isEqualTo(LocalDate.of(2026, 6, 20));
        assertThat(input.history().historyGroups().get(0).sessions()).hasSize(1);
        assertThat(input.plannedWeight()).isEqualTo(100.0);
    }

    @Test
    void infersTopSetsWhenWorkoutEntriesDoNotMarkThem() {
        WorkoutTemplate template = template(true);
        ActiveBlockContextResolver.ResolvedActiveBlockContext blockContext = new ActiveBlockContextResolver.ResolvedActiveBlockContext(
                new BlockContext(null, ProgressionStrategy.WEIGHT_FIRST, 2, 4, false, 7.0, 9.0, 4, 6, 3),
                null
        );

        WorkoutEntry firstEntry = workoutEntryWithoutSetRoles(template, "2026-07-01T10:00:00Z", 100.0, 7.0, 5);
        WorkoutEntry secondEntry = workoutEntryWithoutSetRoles(template, "2026-07-08T10:00:00Z", 105.0, 7.5, 5);

        when(workoutTemplateRepository.findByIdAndUserId(eq(TEMPLATE_ID), eq(USER_ID))).thenReturn(Optional.of(template));
        when(workoutEntryRepository.findDetailedHistoryByTemplateIdAndUserId(eq(TEMPLATE_ID), eq(USER_ID)))
                .thenReturn(List.of(firstEntry, secondEntry));
        when(activeBlockContextResolver.resolve(eq(USER_ID))).thenReturn(blockContext);

        TemplateAnalysisInputResolver.ResolvedTemplateAnalysisInput input = resolver.resolve(USER_ID, TEMPLATE_ID);

        assertThat(input.history().historyGroups()).hasSize(2);
        assertThat(input.history().historyGroups().stream()
                .flatMap(group -> group.sessions().stream())
                .flatMap(session -> session.sets().stream())
                .anyMatch(set -> set.setRole() == SetRole.TOP_SET)).isTrue();
    }

    @Test
    void rejectsTemplateWithoutFocusedExercise() {
        WorkoutTemplate template = template(false);
        when(workoutTemplateRepository.findByIdAndUserId(eq(TEMPLATE_ID), eq(USER_ID))).thenReturn(Optional.of(template));

        assertThatThrownBy(() -> resolver.resolve(USER_ID, TEMPLATE_ID))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("focused exercise");
    }

    @Test
    void rejectsMissingTemplate() {
        when(workoutTemplateRepository.findByIdAndUserId(eq(TEMPLATE_ID), eq(USER_ID))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> resolver.resolve(USER_ID, TEMPLATE_ID))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Workout template not found");
    }

    private WorkoutTemplate template(boolean focused) {
        ExerciseDefinition definition = new ExerciseDefinition();
        ReflectionTestUtils.setField(definition, "id", DEFINITION_ID);
        ExerciseCatalogEquipment equipment = new ExerciseCatalogEquipment("Barbell");
        ExerciseInfo info = new ExerciseInfo();
        info.setEquipment(equipment);
        definition.setExerciseInfo(info);
        definition.setExerciseName("Bench Press");

        ExerciseConfig config = new ExerciseConfig(definition, 3, 5, null, null, null, focused);
        config.setExerciseOrder(0);
        WorkoutTemplate template = new WorkoutTemplate("Push", USER_ID, "Push", List.of(config));
        ReflectionTestUtils.setField(template, "id", TEMPLATE_ID);
        return template;
    }

    private ExerciseHistoryResponseDTO history() {
        ExerciseHistorySetDTO topSet = new ExerciseHistorySetDTO(2, 3, 100.0, 8.7, null, null);
        ExerciseHistorySetDTO backoff = new ExerciseHistorySetDTO(1, 5, 80.0, 7.8, null, null);
        ExerciseHistorySessionDTO session = new ExerciseHistorySessionDTO(
                1,
                Instant.parse("2026-07-09T10:15:30Z"),
                UUID.randomUUID(),
                TEMPLATE_ID,
                null,
                List.of(backoff, topSet)
        );
        ExerciseHistoryGroupDTO group = new ExerciseHistoryGroupDTO(LocalDate.of(2026, 7, 9), 1, List.of(session));
        return new ExerciseHistoryResponseDTO(DEFINITION_ID, "Bench Press", List.of(group));
    }

    private WorkoutEntry workoutEntry(WorkoutTemplate template, String createdAt, double weight, double rpe, int reps) {
        ExerciseDefinition definition = template.getExercises().get(0).getExerciseDefinition();
        ExerciseEntry exerciseEntry = new ExerciseEntry(
                definition,
                "Bench Press",
                "Barbell",
                3,
                List.of(
                        new SetEntry(reps, weight, rpe, null),
                        new SetEntry(3, weight - 10.0, rpe - 0.5, null)
                )
        );
        WorkoutEntry entry = new WorkoutEntry(template, USER_ID, List.of(exerciseEntry), null);
        ReflectionTestUtils.setField(entry, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(entry, "createdAt", Instant.parse(createdAt));
        return entry;
    }

    private WorkoutEntry workoutEntry(WorkoutTemplate template) {
        ExerciseDefinition definition = template.getExercises().get(0).getExerciseDefinition();
        ExerciseEntry exerciseEntry = new ExerciseEntry(
                definition,
                "Bench Press",
                "Barbell",
                3,
                List.of(
                        new SetEntry(5, 80.0, 7.8, null),
                        new SetEntry(3, 100.0, 8.7, null)
                )
        );
        WorkoutEntry entry = new WorkoutEntry(template, USER_ID, List.of(exerciseEntry), null);
        ReflectionTestUtils.setField(entry, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(entry, "createdAt", Instant.parse("2026-07-09T10:15:30Z"));
        return entry;
    }

    private WorkoutEntry workoutEntryWithoutSetRoles(WorkoutTemplate template, String createdAt, double weight, double rpe, int reps) {
        ExerciseDefinition definition = template.getExercises().get(0).getExerciseDefinition();
        ExerciseEntry exerciseEntry = new ExerciseEntry(
                definition,
                "Bench Press",
                "Barbell",
                3,
                List.of(
                        new SetEntry(reps, weight, rpe, null, null),
                        new SetEntry(3, weight - 10.0, rpe - 0.5, null, null)
                )
        );
        WorkoutEntry entry = new WorkoutEntry(template, USER_ID, List.of(exerciseEntry), null);
        ReflectionTestUtils.setField(entry, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(entry, "createdAt", Instant.parse(createdAt));
        return entry;
    }
}
