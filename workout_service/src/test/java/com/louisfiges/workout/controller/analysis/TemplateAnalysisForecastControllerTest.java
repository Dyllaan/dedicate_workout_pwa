package com.louisfiges.workout.controller.analysis;

import com.louisfiges.workout.dao.periodisation.Week;
import com.louisfiges.workout.dto.responses.ForecastResponse;
import com.louisfiges.workout.dto.responses.ForecastSource;
import com.louisfiges.workout.service.analysis.TemplateAnalysisRecommendationService;
import com.louisfiges.workout.repository.WeekRepository;
import com.louisfiges.workout.service.analysis.ForecastEngine;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TemplateAnalysisController.class)
@AutoConfigureMockMvc
@DisplayName("GET /analysis/forecast/week/{weekId}")
class TemplateAnalysisForecastControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TemplateAnalysisRecommendationService recommendationService;

    @MockBean
    private ForecastEngine forecastEngine;

    @MockBean
    private WeekRepository weekRepository;

    @Test
    @DisplayName("returns forecast with intensity and insights for focus exercises")
    void returnsForecast() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID weekId = UUID.randomUUID();
        UUID blockId = UUID.randomUUID();

        Week week = new Week();
        week.setId(weekId);
        week.setWeekNumber(3);
        week.setDeload(false);
        week.setTargetSetsPerExercise(4);

        when(weekRepository.findByIdAndUserId(weekId, userId)).thenReturn(Optional.of(week));

        ForecastResponse response = new ForecastResponse(
                weekId,
                blockId,
                "Strength Block",
                3,
                false,
                87.0,
                Collections.singletonList(new ForecastResponse.ForecastInsight(
                        UUID.randomUUID(),
                        "Bench Press",
                        102.5,
                        90.0,
                        5,
                        8.3,
                        ForecastSource.CURRENT_BLOCK,
                        new ForecastResponse.BestSetInfo(3, 95.0, "2026-07-15T10:30:00Z")
                ))
        );

        when(forecastEngine.generateForecast(eq(week), eq(userId))).thenReturn(response);

        mockMvc.perform(get("/analysis/forecast/week/{weekId}", weekId)
                        .with(jwt().jwt((token) -> token.subject(userId.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.weekId").value(weekId.toString()))
                .andExpect(jsonPath("$.intensityPct").value(87.0))
                .andExpect(jsonPath("$.insights[0].exerciseName").value("Bench Press"))
                .andExpect(jsonPath("$.insights[0].targetWeightKg").value(90.0))
                .andExpect(jsonPath("$.insights[0].source").value("CURRENT_BLOCK"));
    }

    @Test
    @DisplayName("returns 404 when week not found")
    void returns404WhenWeekNotFound() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID weekId = UUID.randomUUID();

        when(weekRepository.findByIdAndUserId(weekId, userId)).thenReturn(Optional.empty());

        mockMvc.perform(get("/analysis/forecast/week/{weekId}", weekId)
                        .with(jwt().jwt((token) -> token.subject(userId.toString()))))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("returns 401 when unauthenticated")
    void returns401WhenUnauthenticated() throws Exception {
        mockMvc.perform(get("/analysis/forecast/week/{weekId}", UUID.randomUUID()))
                .andExpect(status().isUnauthorized());
    }
}
