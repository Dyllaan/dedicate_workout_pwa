package com.louisfiges.workout.controller.core;

import com.louisfiges.workout.dto.responses.SetEntryWithDateDTO;
import com.louisfiges.workout.service.workout.SetEntryService;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/set-entries")
public class SetEntryController {

    private final SetEntryService setEntryService;

    public SetEntryController(SetEntryService setEntryService) {
        this.setEntryService = setEntryService;
    }

    @GetMapping("/best-sets")
    public List<SetEntryWithDateDTO> getBestSets(
            @RequestParam String exerciseName,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return setEntryService.getBestSets(
                userId,
                exerciseName
        );
    }
}
