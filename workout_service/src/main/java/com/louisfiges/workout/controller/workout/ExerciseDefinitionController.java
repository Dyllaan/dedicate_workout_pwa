package com.louisfiges.workout.controller.workout;

import com.louisfiges.workout.dto.request.ExerciseDefinitionCollapseRequest;
import com.louisfiges.workout.dto.request.ExerciseDefinitionResolveRequest;
import com.louisfiges.workout.dto.responses.ExerciseDefinitionDTO;
import com.louisfiges.workout.dto.responses.ExerciseDefinitionCollapseResponseDTO;
import com.louisfiges.workout.dto.responses.ExerciseDefinitionResolveResponseDTO;
import com.louisfiges.workout.dto.responses.PagedResponse;
import com.louisfiges.workout.dto.responses.heatmap.MuscleHeatmapResponseDTO;
import com.louisfiges.workout.service.workout.ExerciseDefinitionService;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/exercise-definitions")
public class ExerciseDefinitionController {

    private final ExerciseDefinitionService exerciseDefinitionService;

    public ExerciseDefinitionController(ExerciseDefinitionService exerciseDefinitionService) {
        this.exerciseDefinitionService = exerciseDefinitionService;
    }

    @GetMapping("/{id}")
    public ExerciseDefinitionDTO getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return exerciseDefinitionService.getById(UUID.fromString(jwt.getSubject()), id);
    }

    @GetMapping
    public PagedResponse<ExerciseDefinitionDTO> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String query,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return exerciseDefinitionService.list(UUID.fromString(jwt.getSubject()), page, size, query);
    }

    @PostMapping("/{canonicalId}/collapse")
    public ExerciseDefinitionCollapseResponseDTO collapse(
            @PathVariable UUID canonicalId,
            @RequestBody ExerciseDefinitionCollapseRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return exerciseDefinitionService.collapse(UUID.fromString(jwt.getSubject()), canonicalId, request);
    }

    @PostMapping("/resolve")
    public ExerciseDefinitionResolveResponseDTO resolveForSearch(
            @RequestBody ExerciseDefinitionResolveRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return exerciseDefinitionService.resolveForSearch(UUID.fromString(jwt.getSubject()), request);
    }

    @GetMapping("/heatmap/workout-templates/{templateId}")
    public MuscleHeatmapResponseDTO getWorkoutTemplateHeatmap(
            @PathVariable UUID templateId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return exerciseDefinitionService.getTemplateHeatmap(UUID.fromString(jwt.getSubject()), templateId);
    }

    @GetMapping("/heatmap/workout-entries/{entryId}")
    public MuscleHeatmapResponseDTO getWorkoutEntryHeatmap(
            @PathVariable UUID entryId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return exerciseDefinitionService.getEntryHeatmap(UUID.fromString(jwt.getSubject()), entryId);
    }

    @GetMapping("/duplicates")
    public List<ExerciseDefinitionDTO> getDuplicates(
            @AuthenticationPrincipal Jwt jwt
    ) {
        return exerciseDefinitionService.listDuplicates(UUID.fromString(jwt.getSubject()));
    }
}
