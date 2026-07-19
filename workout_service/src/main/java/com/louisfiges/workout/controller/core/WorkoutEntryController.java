package com.louisfiges.workout.controller.core;

import com.louisfiges.workout.dto.responses.WorkoutEntryDTO;
import com.louisfiges.workout.service.workout.WorkoutEntryService;
import com.louisfiges.workout.dto.responses.PagedResponse;
import com.louisfiges.workout.dto.request.WorkoutEntryRequest;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/workout-entries")
public class WorkoutEntryController {

    private final WorkoutEntryService workoutEntryService;

    public WorkoutEntryController(WorkoutEntryService workoutEntryService) {
        this.workoutEntryService = workoutEntryService;
    }

    @GetMapping
    public PagedResponse<WorkoutEntryDTO> getAll(
            @RequestParam(required = false) UUID workoutTemplateId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return workoutEntryService.getAllByUser(userId, workoutTemplateId, page, size);
    }

    @GetMapping("/date-range")
    public PagedResponse<WorkoutEntryDTO> getByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return workoutEntryService.getByDateRange(userId, startDate, endDate, page, size);
    }

    @GetMapping("/recent")
    public PagedResponse<WorkoutEntryDTO> getRecent(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return workoutEntryService.getRecentEntries(userId, page, size);
    }

    @GetMapping("/by-exercise")
    public List<WorkoutEntryDTO> getByExercise(
            @RequestParam UUID exerciseDefinitionId,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return workoutEntryService.getAllByExerciseDefinition(userId, exerciseDefinitionId);
    }

    @GetMapping("/{id}")
    public WorkoutEntryDTO getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return workoutEntryService.getById(id, userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WorkoutEntryDTO create(
            @RequestBody WorkoutEntryRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return workoutEntryService.create(request, userId);
    }

    @PutMapping("/{id}")
    public WorkoutEntryDTO update(
            @PathVariable UUID id,
            @RequestBody WorkoutEntryRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return workoutEntryService.update(id, request, userId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        workoutEntryService.delete(id, userId);
    }

    @PostMapping("/backfill-inol")
    public Map<String, Integer> backfillInol(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        int exercisesComputed = workoutEntryService.backfillInol(userId);
        return Map.of("exercisesComputed", exercisesComputed);
    }
}
