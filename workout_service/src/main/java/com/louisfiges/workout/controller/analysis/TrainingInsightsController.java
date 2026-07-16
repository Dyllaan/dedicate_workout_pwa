package com.louisfiges.workout.controller.analysis;

import com.louisfiges.workout.dto.responses.dashboard.DashboardTopLiftDTO;
import com.louisfiges.workout.dto.responses.heatmap.WeeklyMuscleVolumeResponseDTO;
import com.louisfiges.workout.dto.responses.insights.BlockSummaryDTO;
import com.louisfiges.workout.dto.responses.insights.NextWorkoutSignalDTO;
import com.louisfiges.workout.dto.responses.insights.PrioritySignalDTO;
import com.louisfiges.workout.service.analysis.LiftSummaryService;
import com.louisfiges.workout.service.analysis.TrainingInsightsService;
import com.louisfiges.workout.service.analysis.WeeklyMuscleVolumeService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/analysis/training-insights")
public class TrainingInsightsController {

    private final TrainingInsightsService trainingInsightsService;
    private final LiftSummaryService liftSummaryService;
    private final WeeklyMuscleVolumeService weeklyMuscleVolumeService;

    public TrainingInsightsController(TrainingInsightsService trainingInsightsService, LiftSummaryService liftSummaryService, WeeklyMuscleVolumeService weeklyMuscleVolumeService) {
        this.trainingInsightsService = trainingInsightsService;
        this.liftSummaryService = liftSummaryService;
        this.weeklyMuscleVolumeService = weeklyMuscleVolumeService;
    }

    @GetMapping("/next-workout")
    public NextWorkoutSignalDTO getNextWorkoutSignal(Principal principal) {
        return trainingInsightsService.getNextWorkoutSignal(UUID.fromString(principal.getName()));
    }

    @GetMapping("/block-summary")
    public BlockSummaryDTO getBlockSummary(Principal principal) {
        return trainingInsightsService.getBlockSummary(UUID.fromString(principal.getName()));
    }

    @GetMapping("/priority-signals")
    public List<PrioritySignalDTO> getPrioritySignals(Principal principal) {
        return trainingInsightsService.getPrioritySignals(UUID.fromString(principal.getName()));
    }

    @GetMapping("/lift-summary")
    public ResponseEntity<DashboardTopLiftDTO> getLiftSummary(
            Principal principal,
            @RequestParam(defaultValue = "overall") String scope,
            @RequestParam(required = false) UUID templateId
    ) {
        UUID userId = UUID.fromString(principal.getName());
        DashboardTopLiftDTO summary = switch (scope.toLowerCase(Locale.ROOT)) {
            case "overall" -> liftSummaryService.getOverallLiftSummary(userId).orElse(null);
            case "template" -> {
                if (templateId == null) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "templateId is required for template scope");
                }
                yield liftSummaryService.getTemplateFocusedLiftSummary(userId, templateId).orElse(null);
            }
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "scope must be overall or template");
        };

        return ResponseEntity.ok(summary);
    }

    @GetMapping("/weekly-volume")
    public WeeklyMuscleVolumeResponseDTO getWeeklyVolume(
            Principal principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        UUID userId = UUID.fromString(principal.getName());

        if (date == null) {
            return weeklyMuscleVolumeService.getDashboardWeeklyVolume(userId);
        }

        return weeklyMuscleVolumeService.getDashboardWeeklyVolume(userId, date);
    }
}
