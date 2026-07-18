package com.louisfiges.workout.controller.core;

import com.louisfiges.workout.dto.responses.WorkoutEntryDTO;
import com.louisfiges.workout.service.workout.WorkoutEntryService;
import com.louisfiges.workout.dto.responses.PagedResponse;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(WorkoutEntryController.class)
@AutoConfigureMockMvc
@DisplayName("WorkoutEntryController")
class WorkoutEntryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private WorkoutEntryService workoutEntryService;

    @Test
    @DisplayName("uses unfiltered lookup when workoutTemplateId is not provided")
    void getAllWithoutTemplateId() throws Exception {
        UUID userId = UUID.randomUUID();
        when(workoutEntryService.getAllByUser(eq(userId), eq(null), eq(0), eq(10)))
                .thenReturn(new PagedResponse<>(Collections.emptyList(), 0, 10, 0, 0, false, false));

        mockMvc.perform(get("/workout-entries")
                        .with(jwt().jwt((token) -> token.subject(userId.toString())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        verify(workoutEntryService).getAllByUser(userId, null, 0, 10);
    }

    @Test
    @DisplayName("uses template-filtered lookup when workoutTemplateId is provided")
    void getAllWithTemplateId() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID templateId = UUID.randomUUID();
        when(workoutEntryService.getAllByUser(eq(userId), eq(templateId), eq(0), eq(10)))
                .thenReturn(new PagedResponse<>(
                        List.of(new WorkoutEntryDTO(
                                UUID.randomUUID(),
                                null,
                                Collections.emptyList(),
                                null,
                                LocalDateTime.now()
                        )),
                        0,
                        10,
                        1,
                        1,
                        false,
                        false
                ));

        mockMvc.perform(get("/workout-entries")
                        .queryParam("workoutTemplateId", templateId.toString())
                        .with(jwt().jwt((token) -> token.subject(userId.toString())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        verify(workoutEntryService).getAllByUser(userId, templateId, 0, 10);
    }

    @Test
    @DisplayName("GET /by-exercise returns entries filtered by exercise definition id")
    void getByExercise() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID exerciseDefinitionId = UUID.randomUUID();

        when(workoutEntryService.getAllByExerciseDefinition(eq(userId), eq(exerciseDefinitionId)))
                .thenReturn(List.of(
                        new WorkoutEntryDTO(
                                UUID.randomUUID(),
                                null,
                                Collections.emptyList(),
                                null,
                                LocalDateTime.now()
                        )
                ));

        mockMvc.perform(get("/workout-entries/by-exercise")
                        .queryParam("exerciseDefinitionId", exerciseDefinitionId.toString())
                        .with(jwt().jwt((token) -> token.subject(userId.toString())))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        verify(workoutEntryService).getAllByExerciseDefinition(userId, exerciseDefinitionId);
    }

    @Test
    @DisplayName("GET /by-exercise returns 401 when unauthenticated")
    void getByExerciseUnauthenticated() throws Exception {
        mockMvc.perform(get("/workout-entries/by-exercise")
                        .queryParam("exerciseDefinitionId", UUID.randomUUID().toString())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }
}
