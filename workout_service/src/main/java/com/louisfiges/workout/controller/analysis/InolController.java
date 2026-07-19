package com.louisfiges.workout.controller.analysis;

import com.louisfiges.workout.dao.workout.WorkoutInol;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.dto.responses.InolHistoryResponse;
import com.louisfiges.workout.dto.responses.WeeklyInolResponse;
import com.louisfiges.workout.repository.WorkoutInolRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.Comparator;
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

    @GetMapping("/history")
    @Transactional(readOnly = true)
    public ResponseEntity<InolHistoryResponse> getInolHistory(
            Principal principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        UUID userId = UUID.fromString(principal.getName());

        Instant toInstant = to != null ? to.atStartOfDay(ZoneOffset.UTC).plusDays(1).toInstant() : Instant.now();
        Instant fromInstant = from != null
                ? from.atStartOfDay(ZoneOffset.UTC).toInstant()
                : toInstant.minus(12 * 7, ChronoUnit.DAYS);

        List<WorkoutInol> rows = inolRepository.findByUserIdAndCreatedAtBetween(userId, fromInstant, toInstant);

        Map<UUID, List<WorkoutInol>> byEntry = rows.stream()
                .collect(Collectors.groupingBy(wi -> wi.getWorkoutEntry().getId()));

        List<InolHistoryResponse.InolHistoryItem> items = byEntry.entrySet().stream()
                .map(entry -> {
                    List<WorkoutInol> inols = entry.getValue();
                    WorkoutInol first = inols.get(0);
                    WorkoutEntry workoutEntry = first.getWorkoutEntry();
                    WorkoutTemplate template = workoutEntry.getTemplate();

                    double total = inols.stream().mapToDouble(WorkoutInol::getInolScore).sum();

                    List<InolHistoryResponse.PerExerciseInol> perExercise = inols.stream()
                            .map(i -> new InolHistoryResponse.PerExerciseInol(
                                    i.getExerciseName(),
                                    Math.round(i.getInolScore() * 100.0) / 100.0))
                            .collect(Collectors.toList());

                    return new InolHistoryResponse.InolHistoryItem(
                            workoutEntry.getId(),
                            workoutEntry.getCreatedAt(),
                            template.getId(),
                            template.getName(),
                            Math.round(total * 100.0) / 100.0,
                            perExercise);
                })
                .sorted(Comparator.comparing(InolHistoryResponse.InolHistoryItem::createdAt))
                .collect(Collectors.toList());

        return ResponseEntity.ok(new InolHistoryResponse(items));
    }

    private String resolveZone(double totalInol) {
        if (totalInol < 0.4) return "VERY_LOW";
        if (totalInol < 1.0) return "LOW";
        if (totalInol < 2.0) return "MODERATE";
        if (totalInol < 3.0) return "HIGH";
        return "VERY_HIGH";
    }
}
