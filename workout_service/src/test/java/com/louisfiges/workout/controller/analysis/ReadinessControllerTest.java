package com.louisfiges.workout.controller.analysis;

import com.louisfiges.workout.controller.workout.ReadinessController;
import com.louisfiges.workout.dto.request.insights.ReadinessCheckInRequestDTO;
import com.louisfiges.workout.dto.responses.PagedResponse;
import com.louisfiges.workout.dto.responses.insights.ReadinessCheckInDTO;
import com.louisfiges.workout.dto.responses.insights.ReadinessHistoryPointDTO;
import com.louisfiges.workout.dto.responses.insights.ReadinessHistoryResponseDTO;
import com.louisfiges.workout.service.workout.ReadinessService;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ReadinessController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("ReadinessController")
class ReadinessControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ReadinessService readinessService;

    @Test
    @DisplayName("creates readiness check-in")
    void createsReadinessCheckIn() throws Exception {
        UUID userId = UUID.randomUUID();
        ReadinessCheckInRequestDTO request = new ReadinessCheckInRequestDTO((short) 4, (short) 2, (short) 3, (short) 4);
        ReadinessCheckInDTO response = new ReadinessCheckInDTO(
                UUID.randomUUID(),
                (short) 4,
                (short) 2,
                (short) 3,
                (short) 4,
                (short) 15,
                Instant.parse("2026-05-29T08:00:00Z")
        );
        when(readinessService.createCheckIn(eq(userId), eq(request))).thenReturn(response);

        mockMvc.perform(post("/readiness/check-ins")
                        .principal(() -> userId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "sleepQuality": 4,
                                  "stressLevel": 2,
                                  "sorenessLevel": 3,
                                  "confidenceLevel": 4
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.readinessScore").value(15));

        verify(readinessService).createCheckIn(eq(userId), eq(request));
    }

    @Test
    @DisplayName("returns readiness history")
    void returnsReadinessHistory() throws Exception {
        UUID userId = UUID.randomUUID();
        ReadinessHistoryResponseDTO response = new ReadinessHistoryResponseDTO(
                7,
                14.5,
                new PagedResponse<>(
                        List.of(
                                new ReadinessHistoryPointDTO(
                                        Instant.parse("2026-05-29T08:00:00Z"),
                                        (short) 15,
                                        (short) 4,
                                        (short) 2,
                                        (short) 3,
                                        (short) 4
                                )
                        ),
                        0,
                        10,
                        1,
                        1,
                        false,
                        false
                )
        );
        when(readinessService.getHistory(eq(userId), eq(7), eq(0), eq(10))).thenReturn(response);

        mockMvc.perform(get("/readiness/history")
                        .principal(() -> userId.toString())
                        .queryParam("days", "7")
                        .queryParam("page", "0")
                        .queryParam("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.days").value(7))
                .andExpect(jsonPath("$.averageReadinessScore").value(14.5))
                .andExpect(jsonPath("$.points.items[0].readinessScore").value(15));

        verify(readinessService).getHistory(eq(userId), eq(7), eq(0), eq(10));
    }
}
