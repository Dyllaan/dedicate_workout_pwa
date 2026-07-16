package com.louisfiges.workout.controller.analysis;

import com.louisfiges.workout.analysis.types.ExerciseType;
import com.louisfiges.workout.analysis.types.PrimaryBenchmark;
import com.louisfiges.workout.analysis.types.ProgressionMode;
import com.louisfiges.workout.analysis.types.ProgressionStrategy;
import com.louisfiges.workout.analysis.types.SuggestionType;
import com.louisfiges.workout.analysis.types.TrainingState;
import com.louisfiges.workout.dto.responses.heatmap.HeatmapCoverageDTO;
import com.louisfiges.workout.dto.responses.heatmap.WeeklyMuscleVolumeResponseDTO;
import com.louisfiges.workout.dto.responses.insights.BlockSummaryDTO;
import com.louisfiges.workout.dto.responses.dashboard.DashboardTopLiftDTO;
import com.louisfiges.workout.dto.responses.insights.InsightBlockContextDTO;
import com.louisfiges.workout.dto.responses.insights.NextWorkoutSignalDTO;
import com.louisfiges.workout.dto.responses.insights.PrioritySignalDTO;
import com.louisfiges.workout.periodisation.BlockType;
import com.louisfiges.workout.service.analysis.LiftSummaryService;
import com.louisfiges.workout.service.analysis.TrainingInsightsService;
import com.louisfiges.workout.service.analysis.WeeklyMuscleVolumeService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TrainingInsightsController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("TrainingInsightsController")
class TrainingInsightsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TrainingInsightsService trainingInsightsService;

    @MockBean
    private LiftSummaryService liftSummaryService;

    @MockBean
    private WeeklyMuscleVolumeService weeklyMuscleVolumeService;

    @Test
    @DisplayName("serializes the next-workout signal cleanly")
    void serializesNextWorkoutSignal() throws Exception {
        UUID userId = UUID.randomUUID();
        NextWorkoutSignalDTO response = new NextWorkoutSignalDTO(
                UUID.randomUUID(),
                "Upper Day",
                "Low Row",
                "Cable",
                ExerciseType.UPPER_BODY,
                ProgressionMode.WEIGHT_FIRST,
                PrimaryBenchmark.WORKING_SETS,
                ProgressionStrategy.WEIGHT_FIRST,
                TrainingState.IMPROVING,
                SuggestionType.INCREASE,
                155.0,
                "All sets completed at RPE 10.0 - within your block target. Try 155.0kg next session.",
                new InsightBlockContextDTO(
                        "Block A",
                        BlockType.STRENGTH,
                        ProgressionStrategy.WEIGHT_FIRST,
                        1,
                        4,
                        false,
                        7.0,
                        10.0,
                        5,
                        10
                )
        );
        when(trainingInsightsService.getNextWorkoutSignal(eq(userId))).thenReturn(response);

        mockMvc.perform(get("/analysis/training-insights/next-workout")
                        .principal(() -> userId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exerciseName").value("Low Row"))
                .andExpect(jsonPath("$.suggestionType").value("INCREASE"))
                .andExpect(jsonPath("$.suggestedWeightKg").value(155.0));

        verify(trainingInsightsService).getNextWorkoutSignal(eq(userId));
    }

    @Test
    @DisplayName("serializes the block summary cleanly")
    void serializesBlockSummary() throws Exception {
        UUID userId = UUID.randomUUID();
        BlockSummaryDTO response = new BlockSummaryDTO(
                null,
                TrainingState.TRUE_PLATEAU,
                "Plateau risk: low row needs review",
                "Progress looks capped.",
                1,
                2,
                0,
                0
        );
        when(trainingInsightsService.getBlockSummary(eq(userId))).thenReturn(response);

        mockMvc.perform(get("/analysis/training-insights/block-summary")
                        .principal(() -> userId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.overallState").value("TRUE_PLATEAU"))
                .andExpect(jsonPath("$.headline").value("Plateau risk: low row needs review"))
                .andExpect(jsonPath("$.focus").value("Progress looks capped."));

        verify(trainingInsightsService).getBlockSummary(eq(userId));
    }

    @Test
    @DisplayName("serializes the priority signal list cleanly")
    void serializesPrioritySignals() throws Exception {
        UUID userId = UUID.randomUUID();
        when(trainingInsightsService.getPrioritySignals(eq(userId))).thenReturn(
                List.of(
                        new PrioritySignalDTO(
                                1,
                                "Low Row",
                                "Cable",
                                ExerciseType.UPPER_BODY,
                                ProgressionMode.WEIGHT_FIRST,
                                PrimaryBenchmark.WORKING_SETS,
                                TrainingState.TRUE_PLATEAU,
                                SuggestionType.MAINTAIN,
                                150.0,
                                "Progress looks capped."
                        )
                )
        );

        mockMvc.perform(get("/analysis/training-insights/priority-signals")
                        .principal(() -> userId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].exerciseName").value("Low Row"))
                .andExpect(jsonPath("$[0].trainingState").value("TRUE_PLATEAU"));

        verify(trainingInsightsService).getPrioritySignals(eq(userId));
    }

    @Test
    @DisplayName("serializes the overall lift summary cleanly")
    void serializesOverallLiftSummary() throws Exception {
        UUID userId = UUID.randomUUID();
        DashboardTopLiftDTO response = new DashboardTopLiftDTO(
                UUID.randomUUID(),
                "Bench Press",
                "Barbell",
                4,
                120.0,
                20.0,
                java.time.Instant.parse("2026-05-20T10:00:00Z"),
                java.time.Instant.parse("2026-05-01T10:00:00Z"),
                120.0,
                3,
                135.0,
                80.0,
                java.time.LocalDate.of(2026, 5, 15),
                1.5,
                1.69,
                115.0,
                2,
                121.0,
                java.time.Instant.parse("2026-05-20T10:00:00Z"),
                79.0,
                java.time.LocalDate.of(2026, 5, 20),
                1.46,
                1.53,
                120.0,
                3,
                131.0,
                java.time.Instant.parse("2026-05-15T10:00:00Z")
        );
        when(liftSummaryService.getOverallLiftSummary(eq(userId))).thenReturn(java.util.Optional.of(response));

        mockMvc.perform(get("/analysis/training-insights/lift-summary")
                        .principal(() -> userId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exerciseName").value("Bench Press"))
                .andExpect(jsonPath("$.sessionCount").value(4))
                .andExpect(jsonPath("$.personalBestKg").value(120.0))
                .andExpect(jsonPath("$.personalBestTopSetPerformedAt").value("2026-05-20T10:00:00Z"))
                .andExpect(jsonPath("$.improvementBaselineTopSetPerformedAt").value("2026-05-01T10:00:00Z"))
                .andExpect(jsonPath("$.mostRecentTopSetWeightKg").value(115.0))
                .andExpect(jsonPath("$.mostRecentTopSetReps").value(2))
                .andExpect(jsonPath("$.mostRecentEstimatedOneRepMaxKg").value(121.0))
                .andExpect(jsonPath("$.mostRecentTopSetPerformedAt").value("2026-05-20T10:00:00Z"))
                .andExpect(jsonPath("$.previousTopSetWeightKg").value(120.0))
                .andExpect(jsonPath("$.previousTopSetReps").value(3))
                .andExpect(jsonPath("$.previousEstimatedOneRepMaxKg").value(131.0))
                .andExpect(jsonPath("$.previousTopSetPerformedAt").value("2026-05-15T10:00:00Z"));

        verify(liftSummaryService).getOverallLiftSummary(eq(userId));
    }

    @Test
    @DisplayName("serializes the template-focused lift summary cleanly")
    void serializesTemplateFocusedLiftSummary() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID templateId = UUID.randomUUID();
        DashboardTopLiftDTO response = new DashboardTopLiftDTO(
                UUID.randomUUID(),
                "Bench Press",
                "Barbell",
                2,
                120.0,
                20.0,
                java.time.Instant.parse("2026-05-20T10:00:00Z"),
                java.time.Instant.parse("2026-05-01T10:00:00Z"),
                120.0,
                3,
                135.0,
                80.0,
                java.time.LocalDate.of(2026, 5, 15),
                1.5,
                1.69,
                115.0,
                2,
                121.0,
                java.time.Instant.parse("2026-05-20T10:00:00Z"),
                79.0,
                java.time.LocalDate.of(2026, 5, 20),
                1.46,
                1.53,
                120.0,
                3,
                131.0,
                java.time.Instant.parse("2026-05-15T10:00:00Z")
        );
        when(liftSummaryService.getTemplateFocusedLiftSummary(eq(userId), eq(templateId)))
                .thenReturn(java.util.Optional.of(response));

        mockMvc.perform(get("/analysis/training-insights/lift-summary")
                        .param("scope", "template")
                        .param("templateId", templateId.toString())
                        .principal(() -> userId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exerciseName").value("Bench Press"))
                .andExpect(jsonPath("$.sessionCount").value(2));

        verify(liftSummaryService).getTemplateFocusedLiftSummary(eq(userId), eq(templateId));
    }

    @Test
    @DisplayName("serializes weekly volume for current week when no date is provided")
    void serializesWeeklyVolumeCurrentWeek() throws Exception {
        UUID userId = UUID.randomUUID();
        WeeklyMuscleVolumeResponseDTO response = new WeeklyMuscleVolumeResponseDTO(
                "2026-06-15T00:00:00Z",
                "2026-06-22T00:00:00Z",
                new HeatmapCoverageDTO(15, 14, 1),
                List.of(),
                List.of()
        );

        when(weeklyMuscleVolumeService.getDashboardWeeklyVolume(eq(userId))).thenReturn(response);

        mockMvc.perform(get("/analysis/training-insights/weekly-volume")
                        .principal(() -> userId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.weekStart").value("2026-06-15T00:00:00Z"))
                .andExpect(jsonPath("$.weekEnd").value("2026-06-22T00:00:00Z"))
                .andExpect(jsonPath("$.coverage.totalExercises").value(15));

        verify(weeklyMuscleVolumeService).getDashboardWeeklyVolume(eq(userId));
    }

    @Test
    @DisplayName("serializes weekly volume for a specific historical date")
    void serializesWeeklyVolumeHistoricalDate() throws Exception {
        UUID userId = UUID.randomUUID();
        LocalDate targetDate = LocalDate.of(2026, 5, 1);
        WeeklyMuscleVolumeResponseDTO response = new WeeklyMuscleVolumeResponseDTO(
                "2026-04-27T00:00:00Z",
                "2026-05-04T00:00:00Z",
                new HeatmapCoverageDTO(12, 12, 0),
                List.of(),
                List.of()
        );

        when(weeklyMuscleVolumeService.getDashboardWeeklyVolume(eq(userId), eq(targetDate))).thenReturn(response);

        mockMvc.perform(get("/analysis/training-insights/weekly-volume")
                        .param("date", "2026-05-01")
                        .principal(() -> userId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.weekStart").value("2026-04-27T00:00:00Z"))
                .andExpect(jsonPath("$.weekEnd").value("2026-05-04T00:00:00Z"))
                .andExpect(jsonPath("$.coverage.totalExercises").value(12));

        verify(weeklyMuscleVolumeService).getDashboardWeeklyVolume(eq(userId), eq(targetDate));
    }
}
