package com.louisfiges.workout.controller.workout;

import com.louisfiges.workout.dto.request.insights.ReadinessCheckInRequestDTO;
import com.louisfiges.workout.dto.responses.insights.ReadinessCheckInDTO;
import com.louisfiges.workout.dto.responses.insights.ReadinessHistoryResponseDTO;
import com.louisfiges.workout.service.workout.ReadinessService;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/readiness")
public class ReadinessController {

    private final ReadinessService readinessService;

    public ReadinessController(ReadinessService readinessService) {
        this.readinessService = readinessService;
    }

    @PostMapping("/check-ins")
    @ResponseStatus(HttpStatus.CREATED)
    public ReadinessCheckInDTO createCheckIn(
            @RequestBody ReadinessCheckInRequestDTO request,
            Principal principal
    ) {
        UUID userId = UUID.fromString(principal.getName());
        return readinessService.createCheckIn(userId, request);
    }

    @GetMapping("/history")
    public ReadinessHistoryResponseDTO getHistory(
            @RequestParam(defaultValue = "7") int days,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Principal principal
    ) {
        UUID userId = UUID.fromString(principal.getName());
        return readinessService.getHistory(userId, days, page, size);
    }
}
