package com.louisfiges.workout.service.progress;

import com.louisfiges.workout.analysis.StrengthCalculator;
import com.louisfiges.workout.analysis.SetRole;
import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dao.workout.ExerciseEntry;
import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.dto.request.progress.ProgressChartQueryRequestDTO;
import com.louisfiges.workout.dto.responses.progress.ProgressChartPointDTO;
import com.louisfiges.workout.repository.WorkoutEntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("WorkoutProgressService")
class WorkoutProgressServiceTest {

    @Mock
    private WorkoutEntryRepository workoutEntryRepository;

    private WorkoutProgressService service;

    @BeforeEach
    void setUp() {
        service = new WorkoutProgressService(workoutEntryRepository, new StrengthCalculator());
    }

    @Test
    @DisplayName("returns three chart points for three historical entries of the same exercise definition")
    void returnsPointsForMatchingExerciseDefinition() {
        UUID userId = UUID.fromString("00000000-0000-0000-0000-000000000101");
        UUID definitionId = UUID.fromString("00000000-0000-0000-0000-000000000202");

        WorkoutEntry first = workoutEntry(definitionId, "Bench Press", "Barbell", Instant.parse("2026-06-10T08:00:00Z"), 100.0);
        WorkoutEntry second = workoutEntry(definitionId, "Bench Press", "Barbell", Instant.parse("2026-06-08T08:00:00Z"), 102.5);
        WorkoutEntry third = workoutEntry(definitionId, "Bench Press", "Barbell", Instant.parse("2026-06-06T08:00:00Z"), 105.0);
        when(workoutEntryRepository.findDetailedHistoryByUserId(userId)).thenReturn(List.of(first, second, third));

        ProgressChartQueryRequestDTO request = new ProgressChartQueryRequestDTO(
                definitionId,
                "MAX_WEIGHT",
                "ABSOLUTE"
        );

        var response = service.query(userId, request);

        assertThat(response.metric()).isEqualTo("MAX_WEIGHT");
        assertThat(response.comparisonMode()).isEqualTo("ABSOLUTE");
        assertThat(response.points()).hasSize(3);
        assertThat(response.points()).extracting(ProgressChartPointDTO::timestamp)
                .containsExactly(
                        Instant.parse("2026-06-06T08:00:00Z"),
                        Instant.parse("2026-06-08T08:00:00Z"),
                        Instant.parse("2026-06-10T08:00:00Z")
                );
        assertThat(response.points()).extracting(ProgressChartPointDTO::value)
                .containsExactly(105.0, 102.5, 100.0);
        assertThat(response.points()).allSatisfy(point -> assertThat(point.seriesKey()).isEqualTo(definitionId.toString()));
    }

    private WorkoutEntry workoutEntry(
            UUID definitionId,
            String exerciseName,
            String variant,
            Instant createdAt,
            double weight
    ) {
        ExerciseDefinition definition = new ExerciseDefinition();
        ReflectionTestUtils.setField(definition, "id", definitionId);
        definition.setExerciseName(exerciseName);
        definition.setVariant(variant);

        ExerciseEntry exerciseEntry = new ExerciseEntry(
                definition,
                exerciseName,
                variant,
                3,
                List.of(new SetEntry(8, weight, 8.0, null))
        );

        WorkoutTemplate template = new WorkoutTemplate("Upper Day", UUID.randomUUID(), "Upper", List.of());
        ReflectionTestUtils.setField(template, "id", UUID.randomUUID());

        WorkoutEntry entry = new WorkoutEntry(template, UUID.randomUUID(), List.of(exerciseEntry), null);
        ReflectionTestUtils.setField(entry, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(entry, "createdAt", createdAt.truncatedTo(ChronoUnit.SECONDS));
        return entry;
    }
}
