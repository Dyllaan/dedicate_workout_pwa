package com.louisfiges.workout.controller.analysis;

import com.louisfiges.workout.dto.responses.PagedResponse;
import com.louisfiges.workout.dto.responses.heatmap.ExerciseInfoCatalogItemDTO;
import com.louisfiges.workout.service.workout.ExerciseInfoCatalogService;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ExerciseInfoCatalogController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("ExerciseInfoCatalogController")
class ExerciseInfoCatalogControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ExerciseInfoCatalogService exerciseInfoCatalogService;

    @Test
    @DisplayName("searches the backend exercise catalog with paging")
    void searchesCatalog() throws Exception {
        when(exerciseInfoCatalogService.searchCatalog(eq("bench"), eq(0), eq(10))).thenReturn(
                new PagedResponse<>(
                        List.of(new ExerciseInfoCatalogItemDTO(1L, "Bench Press", "Barbell", "Barbell", "Chest")),
                        0,
                        10,
                        1,
                        1,
                        false,
                        false
                )
        );

        mockMvc.perform(get("/exercise-info/catalog")
                        .param("query", "bench")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].name").value("Bench Press"));

        verify(exerciseInfoCatalogService).searchCatalog("bench", 0, 10);
    }

    @Test
    @DisplayName("returns backend curated quick picks with paging")
    void returnsQuickPicks() throws Exception {
        when(exerciseInfoCatalogService.getQuickPicks(eq(0), eq(10))).thenReturn(
                new PagedResponse<>(
                        List.of(new ExerciseInfoCatalogItemDTO(1L, "Bench Press", "Barbell", "Barbell", "Chest")),
                        0,
                        10,
                        1,
                        1,
                        false,
                        false
                )
        );

        mockMvc.perform(get("/exercise-info/quick-picks")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(1))
                .andExpect(jsonPath("$.items[0].name").value("Bench Press"));

        verify(exerciseInfoCatalogService).getQuickPicks(0, 10);
    }
}
