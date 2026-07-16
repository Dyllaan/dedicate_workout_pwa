package com.louisfiges.workout.controller.periodisation;

import com.louisfiges.workout.dto.request.*;
import com.louisfiges.workout.dto.responses.PagedResponse;
import com.louisfiges.workout.dto.responses.SplitDTO;
import com.louisfiges.workout.service.periodisation.SplitService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/splits")
public class SplitController {

    private final SplitService splitService;

    public SplitController(SplitService splitService) {
        this.splitService = splitService;
    }


    @GetMapping
    public PagedResponse<SplitDTO> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return splitService.getAllByUser(userId, page, size);
    }

    @GetMapping("/active")
    public SplitDTO getActive(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return splitService.getActiveSplit(userId);
    }

    @GetMapping("/{id}")
    public SplitDTO getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return splitService.getById(id, userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SplitDTO create(
            @RequestBody SplitRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return splitService.create(request, userId);
    }

    @PutMapping("/{id}")
    public SplitDTO update(
            @PathVariable UUID id,
            @RequestBody SplitRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return splitService.update(id, request, userId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        splitService.delete(id, userId);
    }

    @PutMapping("/{id}/activate")
    public SplitDTO setActive(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return splitService.setActive(id, userId);
    }

    @PatchMapping("/{splitId}/assignments/{workoutTemplateId}/frequency")
    public SplitDTO updateFrequency(
            @PathVariable UUID splitId,
            @PathVariable UUID workoutTemplateId,
            @RequestParam int sessionsPerWeek,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return splitService.updateWorkoutFrequency(splitId, workoutTemplateId, sessionsPerWeek, userId);
    }

    @PatchMapping("/{splitId}/assignments/frequencies")
    public SplitDTO updateFrequencies(
            @PathVariable UUID splitId,
            @RequestBody SplitFrequenciesRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return splitService.updateWorkoutFrequencies(splitId, request.frequencies(), userId);
    }
}
