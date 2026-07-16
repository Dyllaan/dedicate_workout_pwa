package com.louisfiges.workout.controller.progress;

import com.louisfiges.workout.dto.request.progress.ProgressChartQueryRequestDTO;
import com.louisfiges.workout.dto.responses.progress.ProgressChartQueryResponseDTO;
import com.louisfiges.workout.service.progress.WorkoutProgressService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/progress/charts")
public class ProgressController {

    private final WorkoutProgressService workoutProgressService;

    public ProgressController(WorkoutProgressService workoutProgressService) {
        this.workoutProgressService = workoutProgressService;
    }

    @PostMapping("/query")
    public ProgressChartQueryResponseDTO query(
            @RequestBody ProgressChartQueryRequestDTO request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return workoutProgressService.query(UUID.fromString(jwt.getSubject()), request);
    }
}
