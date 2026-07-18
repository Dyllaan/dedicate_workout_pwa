package com.louisfiges.workout.controller.analysis;

import com.louisfiges.workout.dao.workout.WorkoutInol;
import com.louisfiges.workout.dto.responses.WeeklyInolResponse;
import com.louisfiges.workout.repository.WorkoutInolRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/analysis/inol")
public class InolController {

    private final WorkoutInolRepository inolRepository;

    public InolController(WorkoutInolRepository inolRepository) {
        this.inolRepository = inolRepository;
    }

    @GetMapping("/weekly")
    public ResponseEntity<WeeklyInolResponse> getWeeklyInol(Principal principal) {
        UUID userId = UUID.fromString(principal.getName());

        Instant now = Instant.now();
        Instant weekStart = now.atZone(ZoneOffset.UTC)
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .truncatedTo(java.time.temporal.ChronoUnit.DAYS)
                .toInstant();
        Instant weekEnd = weekStart.plusSeconds(7 * 24 * 3600);

        List<WorkoutInol> rows = inolRepository.findByUserIdAndCreatedAtBetween(userId, weekStart, weekEnd);

        Map<String, Double> byExercise = rows.stream()
                .collect(Collectors.groupingBy(
                        WorkoutInol::getExerciseName,
                        Collectors.summingDouble(WorkoutInol::getInolScore)
                ));

        double totalInol = byExercise.values().stream().mapToDouble(Double::doubleValue).sum();

        String zone = resolveZone(totalInol);

        List<WeeklyInolResponse.PerExerciseInol> perExercise = byExercise.entrySet().stream()
                .map(e -> new WeeklyInolResponse.PerExerciseInol(e.getKey(), Math.round(e.getValue() * 100.0) / 100.0))
                .sorted((a, b) -> Double.compare(b.totalInol(), a.totalInol()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(new WeeklyInolResponse(
                Math.round(totalInol * 100.0) / 100.0,
                weekStart,
                zone,
                perExercise
        ));
    }

    private String resolveZone(double totalInol) {
        if (totalInol < 0.4) return "VERY_LOW";
        if (totalInol < 1.0) return "LOW";
        if (totalInol < 2.0) return "MODERATE";
        if (totalInol < 3.0) return "HIGH";
        return "VERY_HIGH";
    }
}
