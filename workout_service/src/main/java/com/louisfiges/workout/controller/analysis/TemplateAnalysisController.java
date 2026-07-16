package com.louisfiges.workout.controller.analysis;

import com.louisfiges.workout.dto.responses.analysis.TemplateAnalysisRecommendationResponse;
import com.louisfiges.workout.service.analysis.TemplateAnalysisRecommendationService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/analysis")
public class TemplateAnalysisController {

    private final TemplateAnalysisRecommendationService templateAnalysisRecommendationService;

    public TemplateAnalysisController(TemplateAnalysisRecommendationService templateAnalysisRecommendationService) {
        this.templateAnalysisRecommendationService = templateAnalysisRecommendationService;
    }

    @PostMapping("/templates/{templateId}/recommendation")
    public TemplateAnalysisRecommendationResponse recommendation(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID templateId,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        return templateAnalysisRecommendationService.recommendation(
                UUID.fromString(jwt.getSubject()),
                templateId,
                limit,
                startDate,
                endDate
        );
    }
}
