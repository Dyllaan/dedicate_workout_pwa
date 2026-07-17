package com.louisfiges.workout.controller.analysis;

import com.louisfiges.workout.dto.request.insights.AutotuneOutcomeRequestDTO;
import com.louisfiges.workout.dto.responses.insights.TopSetAutotuneRecommendationDTO;
import com.louisfiges.workout.service.analysis.TopSetAutotuneService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/insights/autotune")
public class AutotuneController {

    private final TopSetAutotuneService topSetAutotuneService;

    public AutotuneController(TopSetAutotuneService topSetAutotuneService) {
        this.topSetAutotuneService = topSetAutotuneService;
    }

    @GetMapping("/top-set")
    public TopSetAutotuneRecommendationDTO getTopSetRecommendation(
            Principal principal,
            @RequestParam UUID workoutTemplateId,
            @RequestParam(required = false) UUID exerciseDefinitionId,
            @RequestParam String exerciseName,
            @RequestParam(required = false) String variant
    ) {
        return topSetAutotuneService.recommendTopSet(
                UUID.fromString(principal.getName()),
                workoutTemplateId,
                exerciseDefinitionId,
                exerciseName,
                variant
        );
    }

    /**
     * Reserved for future use. The outcome recording flow has been modernized
     * and persistence is no longer required. This endpoint accepts the request
     * body but does not persist any data.
     */
    @PostMapping("/outcomes")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void recordOutcome(Principal principal, @RequestBody AutotuneOutcomeRequestDTO request) {
        topSetAutotuneService.recordOutcome(UUID.fromString(principal.getName()), request);
    }
}
