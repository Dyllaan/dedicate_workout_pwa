package com.louisfiges.workout.controller.analysis;

import com.louisfiges.workout.dto.responses.heatmap.ExerciseInfoCatalogItemDTO;
import com.louisfiges.workout.service.workout.ExerciseInfoCatalogService;
import com.louisfiges.workout.dto.responses.PagedResponse;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/exercise-info")
public class ExerciseInfoCatalogController {

    private final ExerciseInfoCatalogService exerciseInfoCatalogService;

    public ExerciseInfoCatalogController(ExerciseInfoCatalogService exerciseInfoCatalogService) {
        this.exerciseInfoCatalogService = exerciseInfoCatalogService;
    }

    @GetMapping("/catalog")
    public PagedResponse<ExerciseInfoCatalogItemDTO> getCatalog(
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return exerciseInfoCatalogService.searchCatalog(query, page, size);
    }

    @GetMapping("/quick-picks")
    public PagedResponse<ExerciseInfoCatalogItemDTO> getQuickPicks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size
    ) {
        return exerciseInfoCatalogService.getQuickPicks(page, size);
    }
}
