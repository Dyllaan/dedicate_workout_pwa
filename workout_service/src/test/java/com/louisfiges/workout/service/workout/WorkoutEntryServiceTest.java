package com.louisfiges.workout.service.workout;

import com.louisfiges.workout.analysis.SetRole;
import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.dto.request.ExerciseEntryRequest;
import com.louisfiges.workout.dto.request.SetEntryRequest;
import com.louisfiges.workout.dto.request.WorkoutEntryRequest;
import com.louisfiges.workout.dto.request.insights.ReadinessCheckInRequestDTO;
import com.louisfiges.workout.dto.responses.insights.ReadinessCheckInDTO;
import com.louisfiges.workout.repository.WorkoutEntryRepository;
import com.louisfiges.workout.repository.WorkoutTemplateRepository;
import com.louisfiges.workout.service.analysis.AnalysisCacheEvictor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("WorkoutEntryService")
class WorkoutEntryServiceTest {

    @Mock
    private WorkoutEntryRepository workoutEntryRepository;

    @Mock
    private WorkoutTemplateRepository workoutTemplateRepository;

    @Mock
    private ExerciseDefinitionService exerciseDefinitionService;

    @Mock
    private ReadinessService readinessService;

    @Mock
    private AnalysisCacheEvictor analysisCacheEvictor;

    private WorkoutEntryService service;

    @BeforeEach
    void setUp() {
        service = new WorkoutEntryService(
                workoutEntryRepository,
                workoutTemplateRepository,
                exerciseDefinitionService,
                readinessService,
                analysisCacheEvictor
        );
    }

    @Test
    @DisplayName("attaches readiness to workout saves and preserves exercise definition identity in the response")
    void createsWorkoutEntryWithReadiness() {
        UUID userId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID templateId = UUID.fromString("00000000-0000-0000-0000-000000000010");
        UUID entryId = UUID.fromString("00000000-0000-0000-0000-000000000020");
        UUID definitionId = UUID.fromString("00000000-0000-0000-0000-000000000030");

        WorkoutTemplate template = new WorkoutTemplate("Push Day", userId, "Push", List.of());
        ReflectionTestUtils.setField(template, "id", templateId);
        when(workoutTemplateRepository.findByIdAndUserId(templateId, userId)).thenReturn(Optional.of(template));

        ExerciseDefinition definition = new ExerciseDefinition();
        ReflectionTestUtils.setField(definition, "id", definitionId);
        definition.setExerciseName("Bench Press");
        definition.setVariant("Barbell");
        when(exerciseDefinitionService.resolveForUser(userId, definitionId, "Bench Press", "Barbell", null))
                .thenReturn(definition);

        when(workoutEntryRepository.save(any(WorkoutEntry.class))).thenAnswer(invocation -> {
            WorkoutEntry saved = invocation.getArgument(0);
            saved.setId(entryId);
            return saved;
        });

        ReadinessCheckInRequestDTO readinessRequest = new ReadinessCheckInRequestDTO((short) 4, (short) 2, (short) 3, (short) 5);
        when(readinessService.createCheckIn(eq(userId), eq(entryId), eq(readinessRequest))).thenReturn(
                new ReadinessCheckInDTO(
                        UUID.randomUUID(),
                        (short) 4,
                        (short) 2,
                        (short) 3,
                        (short) 5,
                        (short) 15,
                        Instant.parse("2026-06-01T08:00:00Z")
                )
        );

        WorkoutEntryRequest request = new WorkoutEntryRequest(
                templateId,
                List.of(
                        new ExerciseEntryRequest(
                                definitionId,
                                "Bench Press",
                                "Barbell",
                                3,
                                List.of(new SetEntryRequest(8, 100.0, 8.0, "Top set", SetRole.TOP_SET)),
                                null
                        )
                ),
                "Good session",
                readinessRequest
        );

        var response = service.create(request, userId);

        assertThat(response.exercises()).hasSize(1);
        assertThat(response.exercises().get(0).exerciseDefinitionId()).isEqualTo(definitionId);
        verify(readinessService).createCheckIn(eq(userId), eq(entryId), eq(readinessRequest));
    }
}
