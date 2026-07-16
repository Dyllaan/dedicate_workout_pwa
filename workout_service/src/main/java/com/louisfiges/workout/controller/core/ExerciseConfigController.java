package com.louisfiges.workout.controller.core;

import com.louisfiges.workout.dto.ExerciseConfigDTO;
import com.louisfiges.workout.dto.request.ExerciseConfigGoalRepsRequest;
import com.louisfiges.workout.dto.request.ExerciseConfigGoalSetsRequest;
import com.louisfiges.workout.dto.request.ExerciseConfigPrimaryBenchmarkRequest;
import com.louisfiges.workout.dto.request.ExerciseConfigProgressionModeRequest;
import com.louisfiges.workout.dto.request.ExerciseConfigTargetRestSecondsRequest;
import com.louisfiges.workout.service.workout.ExerciseConfigService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/exercise-configs")
public class ExerciseConfigController {

    private final ExerciseConfigService service;

    public ExerciseConfigController(ExerciseConfigService service) {
        this.service = service;
    }

    @GetMapping("/{id}")
    public ExerciseConfigDTO getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return service.getById(id, UUID.fromString(jwt.getSubject()));
    }

    @PatchMapping("/{id}/goal-sets")
    public ExerciseConfigDTO setGoalSets(
            @PathVariable UUID id,
            @RequestBody ExerciseConfigGoalSetsRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return service.setGoalSets(id, UUID.fromString(jwt.getSubject()), request);
    }

    @PatchMapping("/{id}/goal-reps")
    public ExerciseConfigDTO setGoalReps(
            @PathVariable UUID id,
            @RequestBody ExerciseConfigGoalRepsRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return service.setGoalReps(id, UUID.fromString(jwt.getSubject()), request);
    }

    @PatchMapping("/{id}/progression-mode")
    public ExerciseConfigDTO setProgressionMode(
            @PathVariable UUID id,
            @RequestBody ExerciseConfigProgressionModeRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return service.setProgressionMode(id, UUID.fromString(jwt.getSubject()), request);
    }

    @PatchMapping("/{id}/primary-benchmark")
    public ExerciseConfigDTO setPrimaryBenchmark(
            @PathVariable UUID id,
            @RequestBody ExerciseConfigPrimaryBenchmarkRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return service.setPrimaryBenchmark(id, UUID.fromString(jwt.getSubject()), request);
    }

    @PatchMapping("/{id}/rest-seconds")
    public ExerciseConfigDTO setTargetRestSeconds(
            @PathVariable UUID id,
            @RequestBody ExerciseConfigTargetRestSecondsRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return service.setTargetRestSeconds(id, UUID.fromString(jwt.getSubject()), request);
    }

    @PostMapping("/{id}/focus/toggle")
    @ResponseStatus(HttpStatus.OK)
    public ExerciseConfigDTO toggleFocus(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return service.toggleFocus(id, UUID.fromString(jwt.getSubject()));
    }
}
