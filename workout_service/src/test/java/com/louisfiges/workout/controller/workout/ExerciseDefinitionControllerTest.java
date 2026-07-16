package com.louisfiges.workout.controller.workout;

import com.louisfiges.workout.dto.request.ExerciseDefinitionCollapseRequest;
import com.louisfiges.workout.dto.request.ExerciseDefinitionResolveRequest;
import com.louisfiges.workout.dto.responses.ExerciseDefinitionDTO;
import com.louisfiges.workout.dto.responses.ExerciseDefinitionCollapseResponseDTO;
import com.louisfiges.workout.dto.responses.ExerciseDefinitionResolveMatchDTO;
import com.louisfiges.workout.dto.responses.ExerciseDefinitionResolveResponseDTO;
import com.louisfiges.workout.dto.responses.PagedResponse;
import com.louisfiges.workout.heatmap.MappingSource;
import com.louisfiges.workout.service.workout.ExerciseDefinitionService;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ExerciseDefinitionController.class)
@AutoConfigureMockMvc
@DisplayName("ExerciseDefinitionController")
class ExerciseDefinitionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ExerciseDefinitionService exerciseDefinitionService;

    @Test
    @DisplayName("looks up exercise definitions by canonical id")
    void getById() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID definitionId = UUID.randomUUID();
        when(exerciseDefinitionService.getById(eq(userId), eq(definitionId))).thenReturn(
                new ExerciseDefinitionDTO(
                        definitionId,
                        "Low Row",
                        "Cable",
                        null,
                        MappingSource.AUTO,
                        null,
                        java.util.Collections.emptySet(),
                        Instant.parse("2026-06-01T08:00:00Z"),
                        Instant.parse("2026-06-01T08:00:00Z")
                )
        );

        mockMvc.perform(get("/exercise-definitions/{id}", definitionId)
                        .with(jwt().jwt(token -> token.subject(userId.toString())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        verify(exerciseDefinitionService).getById(eq(userId), eq(definitionId));
    }

    @Test
    @DisplayName("lists user exercise definitions for the charts picker")
    void list() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID definitionId = UUID.randomUUID();
        when(exerciseDefinitionService.list(eq(userId), eq(0), eq(20), isNull())).thenReturn(
                PagedResponse.from(
                        List.of(
                                new ExerciseDefinitionDTO(
                                        definitionId,
                                        "Low Row",
                                        "Cable",
                                        null,
                                        MappingSource.AUTO,
                                        null,
                                        java.util.Collections.emptySet(),
                                        Instant.parse("2026-06-01T08:00:00Z"),
                                        Instant.parse("2026-06-01T08:00:00Z")
                                )
                        ),
                        0,
                        20,
                        1
                )
        );

        mockMvc.perform(get("/exercise-definitions")
                        .with(jwt().jwt(token -> token.subject(userId.toString())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(definitionId.toString()))
                .andExpect(jsonPath("$.totalItems").value(1));

        verify(exerciseDefinitionService).list(eq(userId), eq(0), eq(20), isNull());
    }

    @Test
    @DisplayName("collapses duplicate definitions into a canonical row")
    void collapse() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID canonicalId = UUID.randomUUID();
        UUID sourceId = UUID.randomUUID();
        when(exerciseDefinitionService.collapse(eq(userId), eq(canonicalId), any(ExerciseDefinitionCollapseRequest.class))).thenReturn(
                new ExerciseDefinitionCollapseResponseDTO(
                        canonicalId,
                        List.of(sourceId),
                        2,
                        3
                )
        );

        mockMvc.perform(post("/exercise-definitions/{canonicalId}/collapse", canonicalId)
                        .with(jwt().jwt(token -> token.subject(userId.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sourceDefinitionIds":["%s"]}
                                """.formatted(sourceId))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.canonicalDefinitionId").value(canonicalId.toString()))
                .andExpect(jsonPath("$.sourceDefinitionIds[0]").value(sourceId.toString()))
                .andExpect(jsonPath("$.movedExerciseConfigs").value(2))
                .andExpect(jsonPath("$.movedExerciseEntries").value(3));

        verify(exerciseDefinitionService).collapse(eq(userId), eq(canonicalId), any(ExerciseDefinitionCollapseRequest.class));
    }

    @Test
    @DisplayName("resolves searched exercises into a reuse decision")
    void resolveForSearch() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID definitionId = UUID.randomUUID();
        when(exerciseDefinitionService.resolveForSearch(eq(userId), any(ExerciseDefinitionResolveRequest.class))).thenReturn(
                new ExerciseDefinitionResolveResponseDTO(
                        "single_match",
                        List.of(
                                new ExerciseDefinitionResolveMatchDTO(
                                        definitionId,
                                        "Bench Press",
                                        "Barbell",
                                        44L,
                                        MappingSource.CATALOG,
                                        null,
                                        java.util.Collections.emptySet(),
                                        Instant.parse("2026-06-01T08:00:00Z"),
                                        Instant.parse("2026-06-02T08:00:00Z"),
                                        4,
                                        Instant.parse("2026-07-01T08:00:00Z")
                                )
                        ),
                        definitionId
                )
        );

        mockMvc.perform(post("/exercise-definitions/resolve")
                        .with(jwt().jwt(token -> token.subject(userId.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "query": "Bench Press",
                                  "exerciseInfoId": 44,
                                  "exerciseName": "Bench Press",
                                  "variant": "Barbell"
                                }
                                """)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("single_match"))
                .andExpect(jsonPath("$.suggestedDefinitionId").value(definitionId.toString()))
                .andExpect(jsonPath("$.matches[0].id").value(definitionId.toString()))
                .andExpect(jsonPath("$.matches[0].sessionCount").value(4));

        verify(exerciseDefinitionService).resolveForSearch(eq(userId), any(ExerciseDefinitionResolveRequest.class));
    }

    @Test
    @DisplayName("does not expose the legacy analysis route")
    void legacyAnalysisRouteReturnsNotFound() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID definitionId = UUID.randomUUID();

        mockMvc.perform(get("/exercise-definitions/{exerciseDefinitionId}/analysis", definitionId)
                        .with(jwt().jwt(token -> token.subject(userId.toString())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());

        verifyNoInteractions(exerciseDefinitionService);
    }
}
