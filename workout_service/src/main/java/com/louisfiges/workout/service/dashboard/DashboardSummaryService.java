package com.louisfiges.workout.service.dashboard;

import com.louisfiges.workout.dao.periodisation.Programme;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.dao.periodisation.Split;
import com.louisfiges.workout.dto.responses.dashboard.DashboardActiveSplitDTO;
import com.louisfiges.workout.dto.responses.dashboard.DashboardNextWorkoutDTO;
import com.louisfiges.workout.dto.responses.dashboard.DashboardPreviewExerciseDTO;
import com.louisfiges.workout.dto.responses.dashboard.DashboardSummaryDTO;
import com.louisfiges.workout.dto.responses.dashboard.DashboardWeeklyWorkoutProgressDTO;
import com.louisfiges.workout.repository.ProgrammeRepository;
import com.louisfiges.workout.repository.SplitRepository;
import com.louisfiges.workout.repository.WorkoutEntryRepository;
import com.louisfiges.workout.repository.WorkoutTemplateRepository;
import com.louisfiges.workout.service.analysis.LiftSummaryService;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DashboardSummaryService {

    private static final int NEXT_WORKOUT_HISTORY_LIMIT = 20;
    private final Random random = new Random();

    private final WorkoutEntryRepository workoutEntryRepository;
    private final ProgrammeRepository programmeRepository;
    private final WorkoutTemplateRepository workoutTemplateRepository;
    private final SplitRepository splitRepository;
    private final LiftSummaryService liftSummaryService;

    public DashboardSummaryService(
            WorkoutEntryRepository workoutEntryRepository,
            WorkoutTemplateRepository workoutTemplateRepository,
            SplitRepository splitRepository,
            LiftSummaryService liftSummaryService,
            ProgrammeRepository programmeRepository
    ) {
        this.workoutEntryRepository = workoutEntryRepository;
        this.workoutTemplateRepository = workoutTemplateRepository;
        this.splitRepository = splitRepository;
        this.liftSummaryService = liftSummaryService;
        this.programmeRepository = programmeRepository;
    }

    public DashboardSummaryDTO getSummary(UUID userId) {
        int workoutTemplateCount = Math.toIntExact(workoutTemplateRepository.countByUserId(userId));
        int splitCount = Math.toIntExact(splitRepository.countByUserId(userId));
        Optional<Split> activeSplit = splitRepository.findActiveByUserIdWithWorkouts(userId);
        boolean hasLoggedWorkout = workoutEntryRepository.existsByUserId(userId);
        boolean hasCreatedProgramme = programmeRepository.existsBySplitUserId(userId);

        int lifetimeWorkoutCount = (int) workoutEntryRepository.countByUserId(userId);

        Integer daysSinceLastWorkout = workoutEntryRepository.findTopByUserIdOrderByCreatedAtDesc(userId)
                .map(entry -> (int) ChronoUnit.DAYS.between(
                        entry.getCreatedAt().atZone(ZoneOffset.UTC).toLocalDate(),
                        LocalDate.now(ZoneOffset.UTC)))
                .orElse(null);

        DashboardWeeklyWorkoutProgressDTO weeklyProgress = activeSplit
                .map(split -> buildWeeklyProgress(userId, split))
                .orElse(null);

        List<WorkoutEntry> recentHistory = workoutEntryRepository.findDetailedHistoryByUserId(
                userId,
                PageRequest.of(0, NEXT_WORKOUT_HISTORY_LIMIT)
        );

        Optional<DashboardNextWorkoutDTO> nextWorkoutDTO = Optional.empty();
        if (activeSplit.isPresent()) {
            nextWorkoutDTO = buildNextWorkoutFromSplit(activeSplit.get(), recentHistory);
        } else {
            nextWorkoutDTO = buildRandomNextWorkout(userId, recentHistory);
        }

        return new DashboardSummaryDTO(
                workoutTemplateCount,
                splitCount,
                activeSplit.map(split -> new DashboardActiveSplitDTO(split.getId(), split.getName())).orElse(null),
                nextWorkoutDTO.orElse(null),
                liftSummaryService.getOverallLiftSummary(userId).orElse(null),
                hasLoggedWorkout,
                hasCreatedProgramme,
                lifetimeWorkoutCount,
                daysSinceLastWorkout,
                weeklyProgress
        );
    }

    private DashboardWeeklyWorkoutProgressDTO buildWeeklyProgress(UUID userId, Split split) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate monday = today.with(DayOfWeek.MONDAY);
        LocalDate sunday = today.with(DayOfWeek.SUNDAY);

        Instant weekStart = monday.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant weekEnd = sunday.atTime(23, 59, 59, 999_999_999).atZone(ZoneOffset.UTC).toInstant();

        Set<UUID> splitTemplateIds = split.getAssignments().stream()
                .map(assignment -> assignment.getWorkoutTemplate().getId())
                .collect(Collectors.toSet());

        List<WorkoutEntry> weekEntries = workoutEntryRepository.findByUserIdAndCreatedAtBetween(
                userId, weekStart, weekEnd);

        int completedThisWeek = (int) weekEntries.stream()
                .filter(entry -> entry.getTemplate() != null
                        && splitTemplateIds.contains(entry.getTemplate().getId()))
                .count();

        int targetThisWeek = split.getAssignments().stream()
                .mapToInt(assignment -> assignment.getSessionsPerWeek())
                .sum();

        int remainingWorkouts = Math.max(0, targetThisWeek - completedThisWeek);
        int daysRemaining = DayOfWeek.SUNDAY.getValue() - today.getDayOfWeek().getValue() + 1;

        return new DashboardWeeklyWorkoutProgressDTO(
                completedThisWeek, targetThisWeek, remainingWorkouts, daysRemaining);
    }

    private Optional<DashboardNextWorkoutDTO> buildNextWorkoutFromSplit(Split split, List<WorkoutEntry> history) {
        List<WorkoutTemplate> workouts = orderedWorkouts(split);
        if (workouts.isEmpty()) {
            return Optional.empty();
        }

        WorkoutTemplate nextWorkout = resolveNextWorkout(workouts, history);
        if (nextWorkout == null) {
            return Optional.empty();
        }

        return Optional.of(mapToNextWorkoutDTO(nextWorkout, history));
    }

    private Optional<DashboardNextWorkoutDTO> buildRandomNextWorkout(UUID userId, List<WorkoutEntry> history) {
        List<WorkoutTemplate> allTemplates = workoutTemplateRepository.findByUserId(userId);

        if (allTemplates == null || allTemplates.isEmpty()) {
            return Optional.empty();
        }

        WorkoutTemplate randomWorkout = allTemplates.get(random.nextInt(allTemplates.size()));
        return Optional.of(mapToNextWorkoutDTO(randomWorkout, history));
    }

    // Extracted mapping logic so it can be reused by both Split-based and Random-based flows
    private DashboardNextWorkoutDTO mapToNextWorkoutDTO(WorkoutTemplate nextWorkout, List<WorkoutEntry> history) {
        WorkoutEntry previousEntry = history.stream()
                .filter(entry -> entry.getTemplate().getId().equals(nextWorkout.getId()))
                .findFirst()
                .orElse(null);

        Integer lastSetCount = previousEntry == null
                ? null
                : previousEntry.getExercises().stream().mapToInt(exercise -> exercise.getSets().size()).sum();

        List<DashboardPreviewExerciseDTO> previewExercises = nextWorkout.getExercises().stream()
                .limit(6)
                .map(exercise -> new DashboardPreviewExerciseDTO(
                        exercise.getExerciseDefinition() != null
                                ? exercise.getExerciseDefinition().getExerciseName()
                                : nextWorkout.getName(),
                        exercise.getExerciseDefinition() != null
                                ? exercise.getExerciseDefinition().getVariant()
                                : null,
                        exercise.getGoalSets()
                ))
                .toList();

        return new DashboardNextWorkoutDTO(
                nextWorkout.getId(),
                nextWorkout.getName(),
                nextWorkout.getCategory(),
                previewExercises,
                Math.max(0, nextWorkout.getExercises().size() - previewExercises.size()),
                previousEntry == null ? null : previousEntry.getCreatedAt(),
                lastSetCount
        );
    }

    private WorkoutTemplate resolveNextWorkout(List<WorkoutTemplate> workouts, List<WorkoutEntry> history) {
        Map<UUID, Integer> indexByWorkoutId = new HashMap<>();
        for (int i = 0; i < workouts.size(); i++) {
            indexByWorkoutId.put(workouts.get(i).getId(), i);
        }

        WorkoutEntry lastSplitEntry = history.stream()
                .filter(entry -> indexByWorkoutId.containsKey(entry.getTemplate().getId()))
                .findFirst()
                .orElse(null);
        if (lastSplitEntry == null) {
            return workouts.get(0);
        }

        Integer currentIndex = indexByWorkoutId.get(lastSplitEntry.getTemplate().getId());
        return currentIndex == null ? workouts.get(0) : workouts.get((currentIndex + 1) % workouts.size());
    }

    private List<WorkoutTemplate> orderedWorkouts(Split split) {
        Map<UUID, WorkoutTemplate> detailedById = new HashMap<>();
        for (var assignment : split.getAssignments()) {
            detailedById.put(assignment.getWorkoutTemplate().getId(), assignment.getWorkoutTemplate());
        }

        List<WorkoutTemplate> workouts = new ArrayList<>();
        split.getAssignments().stream()
                .sorted(Comparator.comparingInt(assignment -> assignment.getWorkoutOrder()))
                .forEach(assignment -> {
                    WorkoutTemplate workout = detailedById.get(assignment.getWorkoutTemplate().getId());
                    if (workout != null) {
                        workouts.add(workout);
                    }
                });
        return workouts;
    }
}