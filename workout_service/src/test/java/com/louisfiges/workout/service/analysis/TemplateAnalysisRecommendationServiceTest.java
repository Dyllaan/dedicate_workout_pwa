package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.analysis.PlateauDetector;
import com.louisfiges.workout.analysis.ProgressionAnalyser;
import com.louisfiges.workout.analysis.types.BlockContext;
import com.louisfiges.workout.analysis.types.ProgressionStrategy;
import com.louisfiges.workout.dto.responses.analysis.TemplateAnalysisRecommendationResponse;
import com.louisfiges.workout.dto.responses.exercisehistory.ExerciseHistoryBlockContextDTO;
import com.louisfiges.workout.dto.responses.exercisehistory.ExerciseHistoryGroupDTO;
import com.louisfiges.workout.dto.responses.exercisehistory.ExerciseHistoryResponseDTO;
import com.louisfiges.workout.dto.responses.exercisehistory.ExerciseHistorySessionDTO;
import com.louisfiges.workout.dto.responses.exercisehistory.ExerciseHistorySetDTO;
import com.louisfiges.workout.periodisation.BlockType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TemplateAnalysisRecommendationServiceTest {

    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID TEMPLATE_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");

    @Mock
    private TemplateAnalysisInputResolver templateAnalysisInputResolver;

    private TemplateAnalysisRecommendationService service;

    @BeforeEach
    void setUp() {
        service = new TemplateAnalysisRecommendationService(
                templateAnalysisInputResolver,
                new ProgressionAnalyser(5),
                new PlateauDetector(5, 2.0)
        );
    }

    @Test
    void returnsRecommendationTrendPlateauAndHistorySummaryForComparableHistory() {
        when(templateAnalysisInputResolver.resolve(eq(USER_ID), eq(TEMPLATE_ID), eq(8), eq(LocalDate.parse("2026-07-01")), eq(LocalDate.parse("2026-07-31"))))
                .thenReturn(resolvedInput(progressingHistory(), 105.0, 5, 8.0));

        TemplateAnalysisRecommendationResponse response = service.recommendation(
                USER_ID,
                TEMPLATE_ID,
                8,
                LocalDate.parse("2026-07-01"),
                LocalDate.parse("2026-07-31")
        );

        assertThat(response.suggestion().type()).isEqualTo("INCREASE");
        assertThat(response.suggestion().suggestedWeightKg()).isGreaterThan(105.0);
        assertThat(response.plateau().detected()).isFalse();
        assertThat(response.trend().direction()).isEqualTo("UP");
        assertThat(response.trend().comparableObservationCount()).isEqualTo(5);
        assertThat(response.historySummary()).isNotNull();
        assertThat(response.historySummary().points()).hasSize(5);
        assertThat(response.historySummary().points().get(0).pointType()).isEqualTo("ACTUAL");
    }

    @Test
    void flagsPlateauWhenEstimatedOneRepMaxTrendIsFlat() {
        when(templateAnalysisInputResolver.resolve(eq(USER_ID), eq(TEMPLATE_ID), eq(8), eq(LocalDate.parse("2026-07-01")), eq(LocalDate.parse("2026-07-31"))))
                .thenReturn(resolvedInput(plateauHistory(), 100.0, 5, 8.0));

        TemplateAnalysisRecommendationResponse response = service.recommendation(
                USER_ID,
                TEMPLATE_ID,
                8,
                LocalDate.parse("2026-07-01"),
                LocalDate.parse("2026-07-31")
        );

        assertThat(response.plateau().detected()).isTrue();
        assertThat(response.plateau().reason()).contains("estimated 1RM trend");
        assertThat(response.trend().direction()).isEqualTo("FLAT");
    }

    @Test
    void rejectsSparseHistoryWithBadRequest() {
        when(templateAnalysisInputResolver.resolve(eq(USER_ID), eq(TEMPLATE_ID), eq(8), eq(LocalDate.parse("2026-07-01")), eq(LocalDate.parse("2026-07-31"))))
                .thenReturn(resolvedInput(sparseHistory(), 100.0, 5, 8.0));

        assertThatThrownBy(() -> service.recommendation(
                USER_ID,
                TEMPLATE_ID,
                8,
                LocalDate.parse("2026-07-01"),
                LocalDate.parse("2026-07-31")
        )).hasMessageContaining("Insufficient comparable top-set history");
    }

    private TemplateAnalysisInputResolver.ResolvedTemplateAnalysisInput resolvedInput(
            ExerciseHistoryResponseDTO history,
            double plannedWeight,
            int plannedReps,
            double targetRpe
    ) {
        return new TemplateAnalysisInputResolver.ResolvedTemplateAnalysisInput(
                TEMPLATE_ID,
                UUID.randomUUID(),
                history,
                new ActiveBlockContextResolver.ResolvedActiveBlockContext(
                        new BlockContext(BlockType.STRENGTH, ProgressionStrategy.WEIGHT_FIRST, 2, 4, false, 7.0, 8.5, 4, 6, 3),
                        blockContextDto()
                ),
                plannedWeight,
                plannedReps,
                targetRpe,
                2.5
        );
    }

    private ExerciseHistoryResponseDTO progressingHistory() {
        return history(List.of(
                session("2026-07-01T10:15:30Z", 95.0, 5, 5, 7.0),
                session("2026-07-08T10:15:30Z", 97.5, 5, 5, 7.2),
                session("2026-07-15T10:15:30Z", 100.0, 5, 5, 7.5),
                session("2026-07-22T10:15:30Z", 102.5, 5, 5, 7.8),
                session("2026-07-29T10:15:30Z", 105.0, 5, 5, 8.0)
        ));
    }

    private ExerciseHistoryResponseDTO plateauHistory() {
        return history(List.of(
                session("2026-07-01T10:15:30Z", 100.0, 5, 5, 8.0),
                session("2026-07-08T10:15:30Z", 100.0, 5, 5, 8.1),
                session("2026-07-15T10:15:30Z", 100.0, 5, 5, 8.0),
                session("2026-07-22T10:15:30Z", 100.0, 5, 5, 8.2),
                session("2026-07-29T10:15:30Z", 100.0, 5, 5, 8.1)
        ));
    }

    private ExerciseHistoryResponseDTO sparseHistory() {
        return history(List.of(
                session("2026-07-29T10:15:30Z", 100.0, 5, 5, 8.1)
        ));
    }

    private ExerciseHistoryResponseDTO history(List<ExerciseHistorySessionDTO> sessions) {
        return new ExerciseHistoryResponseDTO(
                UUID.randomUUID(),
                "Bench Press",
                List.of(new ExerciseHistoryGroupDTO(LocalDate.parse("2026-07-29"), 1, sessions))
        );
    }

    private ExerciseHistorySessionDTO session(String performedAt, double weight, int reps, int goalReps, double rpe) {
        return new ExerciseHistorySessionDTO(
                1,
                Instant.parse(performedAt),
                UUID.randomUUID(),
                TEMPLATE_ID,
                blockContextDto(),
                List.of(new ExerciseHistorySetDTO(1, reps, weight, rpe, null, com.louisfiges.workout.analysis.SetRole.TOP_SET))
        );
    }

    private ExerciseHistoryBlockContextDTO blockContextDto() {
        return new ExerciseHistoryBlockContextDTO(
                UUID.randomUUID(),
                "Strength Block",
                BlockType.STRENGTH,
                ProgressionStrategy.WEIGHT_FIRST,
                2,
                4,
                false,
                7.0,
                8.5,
                4,
                6
        );
    }
}
