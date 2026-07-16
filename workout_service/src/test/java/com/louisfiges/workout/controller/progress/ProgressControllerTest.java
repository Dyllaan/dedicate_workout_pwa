package com.louisfiges.workout.controller.progress;

import com.louisfiges.workout.dto.request.progress.ProgressChartQueryRequestDTO;
import com.louisfiges.workout.dto.responses.progress.ProgressChartPointDTO;
import com.louisfiges.workout.dto.responses.progress.ProgressChartQueryResponseDTO;
import com.louisfiges.workout.service.progress.WorkoutProgressService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProgressController.class)
@AutoConfigureMockMvc
@DisplayName("ProgressController")
class ProgressControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private WorkoutProgressService workoutProgressService;

    @Test
    @DisplayName("wires chart queries through canonical exercise definition ids")
    void queryChart() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID definitionId = UUID.randomUUID();
        ProgressChartQueryRequestDTO request = new ProgressChartQueryRequestDTO(
                definitionId,
                "BEST_SET_E1RM",
                "ABSOLUTE"
        );
        ProgressChartQueryResponseDTO response = new ProgressChartQueryResponseDTO(
                "kg",
                "BEST_SET_E1RM",
                "ABSOLUTE",
                List.of(
                        new ProgressChartPointDTO(Instant.parse("2026-06-01T08:00:00Z"), definitionId.toString(), 125.0),
                        new ProgressChartPointDTO(Instant.parse("2026-06-08T08:00:00Z"), definitionId.toString(), 127.5),
                        new ProgressChartPointDTO(Instant.parse("2026-06-15T08:00:00Z"), definitionId.toString(), 130.0)
                )
        );
        when(workoutProgressService.query(eq(userId), eq(request))).thenReturn(response);

        mockMvc.perform(post("/progress/charts/query")
                        .with(jwt().jwt(token -> token.subject(userId.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "exerciseDefinitionId": "%s",
                                  "metric": "BEST_SET_E1RM",
                                  "comparisonMode": "ABSOLUTE"
                                }
                                """.formatted(definitionId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.points.length()").value(3));

        verify(workoutProgressService).query(eq(userId), eq(request));
    }
}
