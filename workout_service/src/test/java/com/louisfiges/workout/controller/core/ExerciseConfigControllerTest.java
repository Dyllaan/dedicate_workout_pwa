package com.louisfiges.workout.controller.core;

import com.louisfiges.workout.analysis.types.PrimaryBenchmark;
import com.louisfiges.workout.analysis.types.ProgressionMode;
import com.louisfiges.workout.dto.ExerciseConfigDTO;
import com.louisfiges.workout.dto.request.ExerciseConfigGoalRepsRequest;
import com.louisfiges.workout.dto.request.ExerciseConfigGoalSetsRequest;
import com.louisfiges.workout.dto.request.ExerciseConfigPrimaryBenchmarkRequest;
import com.louisfiges.workout.dto.request.ExerciseConfigProgressionModeRequest;
import com.louisfiges.workout.dto.request.ExerciseConfigTargetRestSecondsRequest;
import com.louisfiges.workout.service.workout.ExerciseConfigService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ExerciseConfigController.class)
@AutoConfigureMockMvc
@DisplayName("ExerciseConfigController")
class ExerciseConfigControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ExerciseConfigService service;

    @Test
    @DisplayName("wires get by id through the authenticated user")
    void getById() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID configId = UUID.randomUUID();
        when(service.getById(eq(configId), eq(userId))).thenReturn(sampleDto(configId));

        mockMvc.perform(get("/exercise-configs/{id}", configId)
                        .with(jwt().jwt(token -> token.subject(userId.toString())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        verify(service).getById(configId, userId);
    }

    @Test
    @DisplayName("wires goal set updates")
    void setGoalSets() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID configId = UUID.randomUUID();
        when(service.setGoalSets(eq(configId), eq(userId), eq(new ExerciseConfigGoalSetsRequest(4))))
                .thenReturn(sampleDto(configId));

        mockMvc.perform(patch("/exercise-configs/{id}/goal-sets", configId)
                        .with(jwt().jwt(token -> token.subject(userId.toString())))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"goalSets\":4}"))
                .andExpect(status().isOk());

        verify(service).setGoalSets(configId, userId, new ExerciseConfigGoalSetsRequest(4));
    }

    @Test
    @DisplayName("wires goal rep updates")
    void setGoalReps() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID configId = UUID.randomUUID();
        when(service.setGoalReps(eq(configId), eq(userId), eq(new ExerciseConfigGoalRepsRequest(8))))
                .thenReturn(sampleDto(configId));

        mockMvc.perform(patch("/exercise-configs/{id}/goal-reps", configId)
                        .with(jwt().jwt(token -> token.subject(userId.toString())))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"goalReps\":8}"))
                .andExpect(status().isOk());

        verify(service).setGoalReps(configId, userId, new ExerciseConfigGoalRepsRequest(8));
    }

    @Test
    @DisplayName("wires progression mode updates")
    void setProgressionMode() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID configId = UUID.randomUUID();
        ExerciseConfigProgressionModeRequest request = new ExerciseConfigProgressionModeRequest(ProgressionMode.REPS_FIRST);
        when(service.setProgressionMode(eq(configId), eq(userId), eq(request)))
                .thenReturn(sampleDto(configId));

        mockMvc.perform(patch("/exercise-configs/{id}/progression-mode", configId)
                        .with(jwt().jwt(token -> token.subject(userId.toString())))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"progressionMode\":\"REPS_FIRST\"}"))
                .andExpect(status().isOk());

        verify(service).setProgressionMode(configId, userId, request);
    }

    @Test
    @DisplayName("wires primary benchmark updates")
    void setPrimaryBenchmark() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID configId = UUID.randomUUID();
        ExerciseConfigPrimaryBenchmarkRequest request = new ExerciseConfigPrimaryBenchmarkRequest(PrimaryBenchmark.TOP_SET);
        when(service.setPrimaryBenchmark(eq(configId), eq(userId), eq(request)))
                .thenReturn(sampleDto(configId));

        mockMvc.perform(patch("/exercise-configs/{id}/primary-benchmark", configId)
                        .with(jwt().jwt(token -> token.subject(userId.toString())))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"primaryBenchmark\":\"TOP_SET\"}"))
                .andExpect(status().isOk());

        verify(service).setPrimaryBenchmark(configId, userId, request);
    }

    @Test
    @DisplayName("wires rest second updates")
    void setTargetRestSeconds() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID configId = UUID.randomUUID();
        ExerciseConfigTargetRestSecondsRequest request = new ExerciseConfigTargetRestSecondsRequest(120);
        when(service.setTargetRestSeconds(eq(configId), eq(userId), eq(request)))
                .thenReturn(sampleDto(configId));

        mockMvc.perform(patch("/exercise-configs/{id}/rest-seconds", configId)
                        .with(jwt().jwt(token -> token.subject(userId.toString())))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetRestSeconds\":120}"))
                .andExpect(status().isOk());

        verify(service).setTargetRestSeconds(configId, userId, request);
    }

    @Test
    @DisplayName("wires focus toggle")
    void toggleFocus() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID configId = UUID.randomUUID();
        when(service.toggleFocus(eq(configId), eq(userId))).thenReturn(sampleDto(configId));

        mockMvc.perform(post("/exercise-configs/{id}/focus/toggle", configId)
                        .with(jwt().jwt(token -> token.subject(userId.toString())))
                        .with(csrf())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        verify(service).toggleFocus(configId, userId);
    }

    private ExerciseConfigDTO sampleDto(UUID configId) {
        return new ExerciseConfigDTO(
                configId,
                null,
                3,
                8,
                ProgressionMode.WEIGHT_FIRST,
                PrimaryBenchmark.WORKING_SETS,
                90,
                false
        );
    }
}
