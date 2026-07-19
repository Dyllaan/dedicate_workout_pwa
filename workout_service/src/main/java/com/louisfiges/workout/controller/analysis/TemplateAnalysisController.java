package com.louisfiges.workout.controller.analysis;

import com.louisfiges.workout.dao.periodisation.Week;
import com.louisfiges.workout.dto.responses.ForecastResponse;
import com.louisfiges.workout.dto.responses.analysis.TemplateAnalysisRecommendationResponse;
import com.louisfiges.workout.repository.WeekRepository;
import com.louisfiges.workout.service.analysis.ForecastEngine;
import com.louisfiges.workout.service.analysis.TemplateAnalysisRecommendationService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/analysis")
public class TemplateAnalysisController {

    private final TemplateAnalysisRecommendationService templateAnalysisRecommendationService;
    private final ForecastEngine forecastEngine;
    private final WeekRepository weekRepository;

    public TemplateAnalysisController(
            TemplateAnalysisRecommendationService templateAnalysisRecommendationService,
            ForecastEngine forecastEngine,
            WeekRepository weekRepository) {
        this.templateAnalysisRecommendationService = templateAnalysisRecommendationService;
        this.forecastEngine = forecastEngine;
        this.weekRepository = weekRepository;
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

    @GetMapping("/forecast/week/{weekId}")
    public ForecastResponse getWeekForecast(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID weekId) {
        UUID userId = UUID.fromString(jwt.getSubject());
        Week week = weekRepository.findByIdAndUserId(weekId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Week not found"));
        return forecastEngine.generateForecast(week, userId);
    }
}
