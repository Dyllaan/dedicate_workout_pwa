package com.louisfiges.workout.controller.analysis;

import com.louisfiges.workout.dto.responses.analysis.TemplateAnalysisRecommendationResponse;
import com.louisfiges.workout.repository.WeekRepository;
import com.louisfiges.workout.service.analysis.ForecastEngine;
import com.louisfiges.workout.service.analysis.TemplateAnalysisRecommendationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TemplateAnalysisController.class)
@AutoConfigureMockMvc
@DisplayName("TemplateAnalysisController")
class TemplateAnalysisControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TemplateAnalysisRecommendationService templateAnalysisRecommendationService;

    @MockBean
    private ForecastEngine forecastEngine;

    @MockBean
    private WeekRepository weekRepository;

    @Test
    void exposesConsolidatedRecommendationEndpoint() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID templateId = UUID.randomUUID();
        when(templateAnalysisRecommendationService.recommendation(
                eq(userId),
                eq(templateId),
                eq(8),
                eq(LocalDate.parse("2026-07-01")),
                eq(LocalDate.parse("2026-07-11"))
        )).thenReturn(sampleResponse());

        mockMvc.perform(post("/analysis/templates/{templateId}/recommendation", templateId)
                        .with(jwt().jwt(token -> token.subject(userId.toString())))
                        .param("limit", "8")
                        .param("startDate", "2026-07-01")
                        .param("endDate", "2026-07-11")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.suggestion.type").value("INCREASE"))
                .andExpect(jsonPath("$.suggestion.suggestedWeightKg").value(102.5))
                .andExpect(jsonPath("$.plateau.detected").value(true))
                .andExpect(jsonPath("$.trend.direction").value("FLAT"))
                .andExpect(jsonPath("$.historySummary.points[0].pointType").value("ACTUAL"));

        verify(templateAnalysisRecommendationService).recommendation(
                eq(userId),
                eq(templateId),
                eq(8),
                eq(LocalDate.parse("2026-07-01")),
                eq(LocalDate.parse("2026-07-11"))
        );
    }

    @Test
    void removesLegacyRelayEndpoints() throws Exception {
        UUID templateId = UUID.randomUUID();

        mockMvc.perform(get("/analysis/templates/{templateId}/forecast", templateId)
                        .with(jwt()))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/analysis/templates/{templateId}/trajectory", templateId)
                        .with(jwt()))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/analysis/templates/{templateId}/recommend", templateId)
                        .with(jwt()))
                .andExpect(status().isNotFound());
    }

    private TemplateAnalysisRecommendationResponse sampleResponse() {
        return new TemplateAnalysisRecommendationResponse(
                new TemplateAnalysisRecommendationResponse.Suggestion(
                        "INCREASE",
                        102.5,
                        "All sets completed inside the target RPE."
                ),
                new TemplateAnalysisRecommendationResponse.Plateau(
                        true,
                        "Your estimated 1RM trend shows only 1.5% growth over the last 5 sessions."
                ),
                new TemplateAnalysisRecommendationResponse.Trend(
                        0.02,
                        109.5,
                        0.91,
                        5,
                        "FLAT"
                ),
                new TemplateAnalysisRecommendationResponse.HistorySummary(
                        List.of(
                                new TemplateAnalysisRecommendationResponse.HistoryPoint(
                                        Instant.parse("2026-07-07T10:15:30Z"),
                                        100.0,
                                        5,
                                        7.5,
                                        "ACTUAL"
                                )
                        )
                )
        );
    }
}
