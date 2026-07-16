package com.louisfiges.workout.controller.core;

import com.louisfiges.workout.dto.responses.WorkoutTemplateDTO;
import com.louisfiges.workout.service.workout.WorkoutTemplateService;
import com.louisfiges.workout.dto.responses.PagedResponse;
import com.louisfiges.workout.dto.request.WorkoutTemplateRequest;

import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/workout-templates")
public class WorkoutTemplateController {

    private final WorkoutTemplateService workoutTemplateService;

    public WorkoutTemplateController(WorkoutTemplateService workoutTemplateService) {
        this.workoutTemplateService = workoutTemplateService;
    }

    @GetMapping
    public PagedResponse<WorkoutTemplateDTO> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return workoutTemplateService.getAllByUser(userId, page, size);
    }

    @GetMapping("/category/{category}")
    public PagedResponse<WorkoutTemplateDTO> getByCategory(
            @PathVariable String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return workoutTemplateService.getByCategory(userId, category, page, size);
    }

    @GetMapping("/{id}")
    public WorkoutTemplateDTO getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return workoutTemplateService.getById(id, userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WorkoutTemplateDTO create(
            @RequestBody WorkoutTemplateRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return workoutTemplateService.create(request, userId);
    }

    @PutMapping("/{id}")
    public WorkoutTemplateDTO update(
            @PathVariable UUID id,
            @RequestBody WorkoutTemplateRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return workoutTemplateService.update(id, request, userId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        workoutTemplateService.delete(id, userId);
    }

    @GetMapping("/categories")
    public List<String> getAllCategories(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return workoutTemplateService.getAllCategories(userId);
    }

    @GetMapping("/exercises")
    public List<String> getAllExercises(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return workoutTemplateService.getAllExerciseNames(userId);
    }
}
