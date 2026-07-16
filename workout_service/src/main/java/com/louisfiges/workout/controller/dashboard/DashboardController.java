package com.louisfiges.workout.controller.dashboard;

import com.louisfiges.workout.dto.responses.dashboard.DashboardSummaryDTO;
import com.louisfiges.workout.service.dashboard.DashboardSummaryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/dashboard")
public class DashboardController {

    private final DashboardSummaryService dashboardSummaryService;

    public DashboardController(DashboardSummaryService dashboardSummaryService) {
        this.dashboardSummaryService = dashboardSummaryService;
    }

    @GetMapping("/summary")
    public DashboardSummaryDTO getSummary(Principal principal) {
        return dashboardSummaryService.getSummary(UUID.fromString(principal.getName()));
    }
}
