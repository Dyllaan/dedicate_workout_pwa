package com.louisfiges.workout.controller.analysis;

import com.louisfiges.workout.analysis.types.RecommendedAction;
import com.louisfiges.workout.analysis.types.TrainingState;
import com.louisfiges.workout.dto.request.insights.AutotuneOutcomeRequestDTO;
import com.louisfiges.workout.dto.responses.insights.TopSetAutotuneRecommendationDTO;
import com.louisfiges.workout.service.analysis.TopSetAutotuneService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AutotuneController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("AutotuneController")
class AutotuneControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TopSetAutotuneService topSetAutotuneService;

    @Test
    @DisplayName("serializes the top-set recommendation cleanly")
    void serializesTopSetRecommendation() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID workoutTemplateId = UUID.randomUUID();
        UUID exerciseDefinitionId = UUID.randomUUID();
        TopSetAutotuneRecommendationDTO response = new TopSetAutotuneRecommendationDTO(
                "Bench Press",
                "Barbell",
                100.0,
                101.25,
                (short) 18,
                "HIGH",
                2.0,
                "Readiness is strong and the main lift moved well.",
                TrainingState.IMPROVING,
                RecommendedAction.INCREASE_LOAD,
                true
        );
        when(topSetAutotuneService.recommendTopSet(eq(userId), eq(workoutTemplateId), eq(exerciseDefinitionId), eq("Bench Press"), eq("Barbell")))
                .thenReturn(response);

        mockMvc.perform(get("/insights/autotune/top-set")
                        .principal(() -> userId.toString())
                        .queryParam("workoutTemplateId", workoutTemplateId.toString())
                        .queryParam("exerciseDefinitionId", exerciseDefinitionId.toString())
                        .queryParam("exerciseName", "Bench Press")
                        .queryParam("variant", "Barbell"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exerciseName").value("Bench Press"))
                .andExpect(jsonPath("$.adjustedRecommendedWeightKg").value(101.25))
                .andExpect(jsonPath("$.topSetOnly").value(true));

        verify(topSetAutotuneService).recommendTopSet(eq(userId), eq(workoutTemplateId), eq(exerciseDefinitionId), eq("Bench Press"), eq("Barbell"));
    }

    @Test
    @DisplayName("accepts top-set outcomes")
    void acceptsTopSetOutcomes() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID workoutTemplateId = UUID.randomUUID();
        AutotuneOutcomeRequestDTO request = new AutotuneOutcomeRequestDTO(
                workoutTemplateId,
                "Bench Press",
                "Barbell",
                RecommendedAction.INCREASE_LOAD,
                0,
                100.0,
                101.25,
                101.25,
                (short) 18,
                Instant.parse("2026-06-16T08:00:00Z"),
                Instant.parse("2026-06-16T08:45:00Z")
        );

        mockMvc.perform(post("/insights/autotune/outcomes")
                        .principal(() -> userId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "workoutTemplateId": "%s",
                                  "exerciseName": "Bench Press",
                                  "variant": "Barbell",
                                  "action": "INCREASE_LOAD",
                                  "topSetIndex": 0,
                                  "baseRecommendedWeightKg": 100.0,
                                  "adjustedRecommendedWeightKg": 101.25,
                                  "appliedWeightKg": 101.25,
                                  "readinessScore": 18,
                                  "sessionStartedAt": "2026-06-16T08:00:00Z",
                                  "sessionCompletedAt": "2026-06-16T08:45:00Z"
                                }
                                """.formatted(workoutTemplateId)))
                .andExpect(status().isNoContent());

        verify(topSetAutotuneService).recordOutcome(eq(userId), eq(request));
    }
}
