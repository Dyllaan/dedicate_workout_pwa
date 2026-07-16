package com.louisfiges.workout.controller.core;

import com.louisfiges.workout.dto.request.WorkoutUserSettingsRequest;
import com.louisfiges.workout.dto.responses.WorkoutUserSettingsDTO;
import com.louisfiges.workout.service.core.WorkoutUserSettingsService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/workout-settings")
public class WorkoutUserSettingsController {

    private final WorkoutUserSettingsService service;

    public WorkoutUserSettingsController(WorkoutUserSettingsService service) {
        this.service = service;
    }

    @GetMapping
    public WorkoutUserSettingsDTO get(@AuthenticationPrincipal Jwt jwt) {
        return service.getForUser(UUID.fromString(jwt.getSubject()));
    }

    @PutMapping
    public WorkoutUserSettingsDTO update(
            @RequestBody WorkoutUserSettingsRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return service.updateForUser(UUID.fromString(jwt.getSubject()), request);
    }
}
