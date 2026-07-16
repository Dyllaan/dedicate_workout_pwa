package com.louisfiges.workout.controller.core;

import com.louisfiges.workout.dto.request.BodyweightLogRequest;
import com.louisfiges.workout.dto.responses.BodyweightLogDTO;
import com.louisfiges.workout.dto.responses.PagedResponse;
import com.louisfiges.workout.service.core.BodyweightLogService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/bodyweight-logs")
public class BodyweightLogController {

    private final BodyweightLogService bodyweightLogService;

    public BodyweightLogController(BodyweightLogService bodyweightLogService) {
        this.bodyweightLogService = bodyweightLogService;
    }

    @GetMapping
    public PagedResponse<BodyweightLogDTO> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return bodyweightLogService.getAll(userId, page, size);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BodyweightLogDTO create(
            @RequestBody BodyweightLogRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return bodyweightLogService.create(userId, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        bodyweightLogService.delete(id, userId);
    }
}
