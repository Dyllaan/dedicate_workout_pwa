package com.louisfiges.workout.controller.periodisation;

import com.louisfiges.workout.dto.request.UpdateWeekRequest;
import com.louisfiges.workout.service.periodisation.WeekService;
import com.louisfiges.workout.dto.responses.WeekDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/weeks")
public class WeekController {

    private final WeekService weekService;

    public WeekController(WeekService weekService) {
        this.weekService = weekService;
    }

    @GetMapping("/{weekId}")
    public ResponseEntity<WeekDTO> getWeek(
            @PathVariable UUID weekId,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(weekService.getWeek(weekId, userId));
    }

    @PatchMapping("/{weekId}")
    public ResponseEntity<WeekDTO> updateWeek(
            @PathVariable UUID weekId,
            @RequestBody UpdateWeekRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(weekService.update(weekId, request, userId));
    }

    @PatchMapping("/{weekId}/deload")
    public ResponseEntity<WeekDTO> setDeload(
            @PathVariable UUID weekId,
            @RequestParam boolean deload,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(weekService.setDeload(weekId, deload, userId));
    }
}